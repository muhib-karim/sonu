//! Per-model latency and real-time-factor benchmark.
//!
//! Ignored by default; `.github/workflows/benchmark.yml` downloads the
//! selected catalog models and runs it with `--ignored`. Everything on the
//! path is the app's own code: the catalog (`resources/models.json`), the
//! download checksum check, the archive layout handling, the engine load
//! parameters and the Whisper inference parameters. Only the WAV reading and
//! the timing loop are benchmark-specific.
//!
//! Inputs (environment):
//! - `SONU_BENCH_MODELS`: comma-separated catalog ids, in table order.
//! - `SONU_BENCH_DIR`: directory holding each model's downloaded artifact
//!   under the file name from its catalog URL.
//! - `SONU_BENCH_WAV`: 16 kHz, 16-bit mono WAV to transcribe.
//! - `SONU_BENCH_OUT`: directory for `benchmark.json` and `benchmark.md`.
//! - `SONU_BENCH_BUDGET_SECS` (optional, default 90): stop adding timed runs
//!   for a model once they add up to this; at least one always runs.

use super::model::{
    parse_catalog, verify_checksum, ChecksumOutcome, EngineType, ModelInfo, FALLBACK_CATALOG_JSON,
};
use super::transcription::whisper_inference_params;
use std::fmt::Write as _;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::time::Instant;
use transcribe_rs::engines::moonshine::{
    ModelVariant, MoonshineEngine, MoonshineInferenceParams, MoonshineModelParams,
};
use transcribe_rs::engines::parakeet::{
    ParakeetEngine, ParakeetInferenceParams, ParakeetModelParams, TimestampGranularity,
};
use transcribe_rs::engines::whisper::{WhisperEngine, WhisperModelParams};
use transcribe_rs::TranscriptionEngine;

/// Phrase every model must produce for the transcript to count as correct.
const REFERENCE_PHRASE: &str = "ask not what your country can do for you";
const MAX_TIMED_RUNS: usize = 3;

/// A loaded engine, configured exactly as `TranscriptionManager::load_model`
/// and `transcribe_inner` configure it.
enum Engine {
    Whisper(WhisperEngine),
    Parakeet(ParakeetEngine),
    Moonshine(MoonshineEngine),
}

impl Engine {
    fn load(engine_type: &EngineType, path: &Path) -> anyhow::Result<Self> {
        let failed = |e: Box<dyn std::error::Error>| anyhow::anyhow!("model load failed: {e}");
        Ok(match engine_type {
            EngineType::Whisper => {
                let mut engine = WhisperEngine::new();
                engine
                    .load_model_with_params(path, WhisperModelParams::default())
                    .map_err(failed)?;
                Engine::Whisper(engine)
            }
            EngineType::Parakeet => {
                let mut engine = ParakeetEngine::new();
                engine
                    .load_model_with_params(path, ParakeetModelParams::int8())
                    .map_err(failed)?;
                Engine::Parakeet(engine)
            }
            EngineType::Moonshine => {
                let mut engine = MoonshineEngine::new();
                let params = MoonshineModelParams {
                    variant: ModelVariant::Base,
                };
                engine
                    .load_model_with_params(path, params)
                    .map_err(failed)?;
                Engine::Moonshine(engine)
            }
        })
    }

    fn transcribe(&mut self, samples: Vec<f32>) -> anyhow::Result<String> {
        let result = match self {
            Engine::Whisper(engine) => {
                engine.transcribe_samples(samples, Some(whisper_inference_params("en", false)))
            }
            Engine::Parakeet(engine) => {
                let params = ParakeetInferenceParams {
                    timestamp_granularity: TimestampGranularity::Segment,
                };
                engine.transcribe_samples(samples, Some(params))
            }
            Engine::Moonshine(engine) => {
                engine.transcribe_samples(samples, Some(MoonshineInferenceParams::default()))
            }
        };
        result
            .map(|r| r.text)
            .map_err(|e| anyhow::anyhow!("transcription failed: {e}"))
    }
}

fn engine_label(engine_type: &EngineType) -> &'static str {
    match engine_type {
        EngineType::Whisper => "Whisper (whisper.cpp)",
        EngineType::Parakeet => "Parakeet (ONNX Runtime)",
        EngineType::Moonshine => "Moonshine (ONNX Runtime)",
    }
}

/// Verifies the downloaded artifact against the catalog checksum and, for
/// archive models, unpacks it with the same layout rule as
/// `ModelManager::download_model`: a single top-level directory becomes the
/// model directory, otherwise the extraction directory itself is used.
fn prepare(model: &ModelInfo, dir: &Path) -> anyhow::Result<PathBuf> {
    let file_name = model
        .url
        .as_deref()
        .and_then(|url| url.rsplit('/').next())
        .ok_or_else(|| anyhow::anyhow!("{}: catalog entry has no url", model.id))?;
    let download = dir.join(file_name);

    match verify_checksum(
        &download,
        model.sha256.as_deref(),
        model.md5.as_deref(),
        model.md5_parts,
    )? {
        ChecksumOutcome::Verified => {}
        other => anyhow::bail!("{}: checksum check failed: {other:?}", model.id),
    }

    if !model.is_directory {
        return Ok(download);
    }

    let extract_dir = dir.join(format!("{}.extracting", model.filename));
    if extract_dir.exists() {
        fs::remove_dir_all(&extract_dir)?;
    }
    fs::create_dir_all(&extract_dir)?;
    tar::Archive::new(flate2::read::GzDecoder::new(File::open(&download)?)).unpack(&extract_dir)?;

    let mut subdirs = Vec::new();
    for entry in fs::read_dir(&extract_dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            subdirs.push(entry.path());
        }
    }
    Ok(match subdirs.as_slice() {
        [only] => only.clone(),
        _ => extract_dir,
    })
}

fn read_wav(path: &Path) -> anyhow::Result<Vec<f32>> {
    let mut reader = hound::WavReader::open(path)?;
    let spec = reader.spec();
    anyhow::ensure!(
        spec.channels == 1 && spec.sample_rate == 16_000 && spec.bits_per_sample == 16,
        "expected 16 kHz 16-bit mono, got {spec:?}"
    );
    Ok(reader
        .samples::<i16>()
        .map(|s| s.map(|v| f32::from(v) / 32_768.0))
        .collect::<Result<Vec<f32>, _>>()?)
}

/// Lowercase, punctuation stripped, whitespace collapsed.
fn normalise(text: &str) -> String {
    let kept: String = text
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect();
    kept.to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Median of a non-empty slice.
fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let mid = sorted.len() / 2;
    if sorted.len().is_multiple_of(2) {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

struct Row {
    id: String,
    name: String,
    engine: &'static str,
    size_mb: u64,
    load_secs: f64,
    first_secs: f64,
    runs: Vec<f64>,
    correct: bool,
    text: String,
}

#[test]
fn median_handles_odd_and_even_counts() {
    assert!((median(&[3.0, 1.0, 2.0]) - 2.0).abs() < 1e-9);
    assert!((median(&[4.0, 1.0, 3.0, 2.0]) - 2.5).abs() < 1e-9);
}

#[test]
fn normalise_strips_punctuation_and_case() {
    assert_eq!(
        normalise("  Ask NOT, what your country -- can do!"),
        "ask not what your country can do"
    );
}

#[test]
#[ignore = "downloads models; run by .github/workflows/benchmark.yml"]
fn benchmark_catalog_models() -> anyhow::Result<()> {
    let dir = PathBuf::from(std::env::var("SONU_BENCH_DIR")?);
    let wav = PathBuf::from(std::env::var("SONU_BENCH_WAV")?);
    let out = PathBuf::from(std::env::var("SONU_BENCH_OUT")?);
    let ids = std::env::var("SONU_BENCH_MODELS")?;
    let budget = std::env::var("SONU_BENCH_BUDGET_SECS")
        .ok()
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(90.0);

    let catalog = parse_catalog(FALLBACK_CATALOG_JSON)?;
    let samples = read_wav(&wav)?;
    let audio_secs = samples.len() as f64 / 16_000.0;

    let mut rows = Vec::new();
    for id in ids.split(',').map(str::trim).filter(|id| !id.is_empty()) {
        let model = catalog
            .iter()
            .find(|m| m.id == id)
            .ok_or_else(|| anyhow::anyhow!("{id} is not in resources/models.json"))?;
        let path = prepare(model, &dir)?;

        let start = Instant::now();
        let mut engine = Engine::load(&model.engine_type, &path)?;
        let load_secs = start.elapsed().as_secs_f64();

        // The first transcription is reported separately: it includes
        // one-off work such as Vulkan pipeline compilation and ONNX Runtime
        // graph optimisation that a user pays once per model load.
        let start = Instant::now();
        let mut text = engine.transcribe(samples.clone())?;
        let first_secs = start.elapsed().as_secs_f64();

        let mut runs = Vec::new();
        while runs.is_empty() || (runs.len() < MAX_TIMED_RUNS && runs.iter().sum::<f64>() < budget)
        {
            let start = Instant::now();
            text = engine.transcribe(samples.clone())?;
            runs.push(start.elapsed().as_secs_f64());
        }

        let correct = normalise(&text).contains(REFERENCE_PHRASE);
        println!(
            "bench: {id} load={load_secs:.2}s first={first_secs:.2}s median={:.2}s n={} rtf={:.3} correct={correct} text={text:?}",
            median(&runs),
            runs.len(),
            median(&runs) / audio_secs
        );
        rows.push(Row {
            id: model.id.clone(),
            name: model.name.clone(),
            engine: engine_label(&model.engine_type),
            size_mb: model.size_mb,
            load_secs,
            first_secs,
            runs,
            correct,
            text,
        });
    }

    let mut md = String::new();
    writeln!(
        md,
        "| Model | Engine | Download | Load | First run | Median run (n) | RTF | Transcript |"
    )?;
    writeln!(md, "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |")?;
    let mut json_rows = Vec::new();
    for row in &rows {
        let med = median(&row.runs);
        writeln!(
            md,
            "| {} | {} | {} MB | {:.2} s | {:.2} s | {:.2} s ({}) | {:.3} | {} |",
            row.name,
            row.engine,
            row.size_mb,
            row.load_secs,
            row.first_secs,
            med,
            row.runs.len(),
            med / audio_secs,
            if row.correct { "correct" } else { "wrong" }
        )?;
        json_rows.push(serde_json::json!({
            "id": row.id,
            "name": row.name,
            "engine": row.engine,
            "size_mb": row.size_mb,
            "load_secs": row.load_secs,
            "first_run_secs": row.first_secs,
            "runs_secs": row.runs,
            "median_secs": med,
            "rtf": med / audio_secs,
            "transcript_correct": row.correct,
            "transcript": row.text,
        }));
    }

    fs::create_dir_all(&out)?;
    fs::write(out.join("benchmark.md"), md)?;
    let report = serde_json::json!({
        "audio_secs": audio_secs,
        "reference_phrase": REFERENCE_PHRASE,
        "models": json_rows,
    });
    fs::write(
        out.join("benchmark.json"),
        serde_json::to_string_pretty(&report)?,
    )?;
    Ok(())
}
