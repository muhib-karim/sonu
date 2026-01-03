---
license: cc-by-4.0
track_downloads: true
language:
- en
- es
- fr
- de
- bg
- hr
- cs
- da
- nl
- et
- fi
- el
- hu
- it
- lv
- lt
- mt
- pl
- pt
- ro
- sk
- sl
- sv
- ru
- uk

pipeline_tag: automatic-speech-recognition
library_name: nemo
datasets:
- nvidia/Granary
- nemo/asr-set-3.0
thumbnail: null
tags:
- automatic-speech-recognition
- speech
- audio
- Transducer
- TDT
- FastConformer
- Conformer
- pytorch
- NeMo
- hf-asr-leaderboard
widget:
- example_title: Librispeech sample 1
  src: https://cdn-media.huggingface.co/speech_samples/sample1.flac
- example_title: Librispeech sample 2
  src: https://cdn-media.huggingface.co/speech_samples/sample2.flac
model-index:
- name: parakeet-tdt-0.6b-v3
  results:
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: AMI (Meetings test)
      type: edinburghcstr/ami
      config: ihm
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 11.31
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: Earnings-22
      type: revdotcom/earnings22
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 11.42
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: GigaSpeech
      type: speechcolab/gigaspeech
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 9.59
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: LibriSpeech (clean)
      type: librispeech_asr
      config: other
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 1.93
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: LibriSpeech (other)
      type: librispeech_asr
      config: other
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 3.59
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: SPGI Speech
      type: kensho/spgispeech
      config: test
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 3.97
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: tedlium-v3
      type: LIUM/tedlium
      config: release1
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 2.75
  - task:
      name: Automatic Speech Recognition
      type: automatic-speech-recognition
    dataset:
      name: Vox Populi
      type: facebook/voxpopuli
      config: en
      split: test
      args:
        language: en
    metrics:
    - name: Test WER
      type: wer
      value: 6.14
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: bg_bg
      split: test
      args:
        language: bg
    metrics:
    - name: Test WER (Bg)
      type: wer
      value: 12.64
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: cs_cz
      split: test
      args:
        language: cs
    metrics:
    - name: Test WER (Cs)
      type: wer
      value: 11.01
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: da_dk
      split: test
      args:
        language: da
    metrics:
    - name: Test WER (Da)
      type: wer
      value: 18.41
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: de_de
      split: test
      args:
        language: de
    metrics:
    - name: Test WER (De)
      type: wer
      value: 5.04
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: el_gr
      split: test
      args:
        language: el
    metrics:
    - name: Test WER (El)
      type: wer
      value: 20.70
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: en_us
      split: test
      args:
        language: en
    metrics:
    - name: Test WER (En)
      type: wer
      value: 4.85
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: es_419
      split: test
      args:
        language: es
    metrics:
    - name: Test WER (Es)
      type: wer
      value: 3.45
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: et_ee
      split: test
      args:
        language: et
    metrics:
    - name: Test WER (Et)
      type: wer
      value: 17.73
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: fi_fi
      split: test
      args:
        language: fi
    metrics:
    - name: Test WER (Fi)
      type: wer
      value: 13.21
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: fr_fr
      split: test
      args:
        language: fr
    metrics:
    - name: Test WER (Fr)
      type: wer
      value: 5.15
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: hr_hr
      split: test
      args:
        language: hr
    metrics:
    - name: Test WER (Hr)
      type: wer
      value: 12.46
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: hu_hu
      split: test
      args:
        language: hu
    metrics:
    - name: Test WER (Hu)
      type: wer
      value: 15.72
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: it_it
      split: test
      args:
        language: it
    metrics:
    - name: Test WER (It)
      type: wer
      value: 3.00
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: lt_lt
      split: test
      args:
        language: lt
    metrics:
    - name: Test WER (Lt)
      type: wer
      value: 20.35
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: lv_lv
      split: test
      args:
        language: lv
    metrics:
    - name: Test WER (Lv)
      type: wer
      value: 22.84
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: mt_mt
      split: test
      args:
        language: mt
    metrics:
    - name: Test WER (Mt)
      type: wer
      value: 20.46
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: nl_nl
      split: test
      args:
        language: nl
    metrics:
    - name: Test WER (Nl)
      type: wer
      value: 7.48
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: pl_pl
      split: test
      args:
        language: pl
    metrics:
    - name: Test WER (Pl)
      type: wer
      value: 7.31
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: pt_br
      split: test
      args:
        language: pt
    metrics:
    - name: Test WER (Pt)
      type: wer
      value: 4.76
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: ro_ro
      split: test
      args:
        language: ro
    metrics:
    - name: Test WER (Ro)
      type: wer
      value: 12.44
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: ru_ru
      split: test
      args:
        language: ru
    metrics:
    - name: Test WER (Ru)
      type: wer
      value: 5.51
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: sk_sk
      split: test
      args:
        language: sk
    metrics:
    - name: Test WER (Sk)
      type: wer
      value: 8.82
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: sl_si
      split: test
      args:
        language: sl
    metrics:
    - name: Test WER (Sl)
      type: wer
      value: 24.03
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: sv_se
      split: test
      args:
        language: sv
    metrics:
    - name: Test WER (Sv)
      type: wer
      value: 15.08
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: FLEURS
      type: google/fleurs
      config: uk_ua
      split: test
      args:
        language: uk
    metrics:
    - name: Test WER (Uk)
      type: wer
      value: 6.79
  # Multilingual LibriSpeech ASR Results
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: Multilingual LibriSpeech
      type: facebook/multilingual_librispeech
      config: spanish
      split: test
      args:
        language: es
    metrics:
    - name: Test WER (Es)
      type: wer
      value: 4.39
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: Multilingual LibriSpeech
      type: facebook/multilingual_librispeech
      config: french
      split: test
      args:
        language: fr
    metrics:
    - name: Test WER (Fr)
      type: wer
      value: 4.97
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: Multilingual LibriSpeech
      type: facebook/multilingual_librispeech
      config: italian
      split: test
      args:
        language: it
    metrics:
    - name: Test WER (It)
      type: wer
      value: 10.08
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: Multilingual LibriSpeech
      type: facebook/multilingual_librispeech
      config: dutch
      split: test
      args:
        language: nl
    metrics:
    - name: Test WER (Nl)
      type: wer
      value: 12.78
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: Multilingual LibriSpeech
      type: facebook/multilingual_librispeech
      config: polish
      split: test
      args:
        language: pl
    metrics:
    - name: Test WER (Pl)
      type: wer
      value: 7.28
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: Multilingual LibriSpeech
      type: facebook/multilingual_librispeech
      config: portuguese
      split: test
      args:
        language: pt
    metrics:
    - name: Test WER (Pt)
      type: wer
      value: 7.50
  # CoVoST2 ASR Results
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: de
      split: test
      args:
        language: de
    metrics:
    - name: Test WER (De)
      type: wer
      value: 4.84
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: en
      split: test
      args:
        language: en
    metrics:
    - name: Test WER (En)
      type: wer
      value: 6.80
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: es
      split: test
      args:
        language: es
    metrics:
    - name: Test WER (Es)
      type: wer
      value: 3.41
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: et
      split: test
      args:
        language: et
    metrics:
    - name: Test WER (Et)
      type: wer
      value: 22.04
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: fr
      split: test
      args:
        language: fr
    metrics:
    - name: Test WER (Fr)
      type: wer
      value: 6.05
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: it
      split: test
      args:
        language: it
    metrics:
    - name: Test WER (It)
      type: wer
      value: 3.69
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: lv
      split: test
      args:
        language: lv
    metrics:
    - name: Test WER (Lv)
      type: wer
      value: 38.36
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: nl
      split: test
      args:
        language: nl
    metrics:
    - name: Test WER (Nl)
      type: wer
      value: 6.50
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: pt
      split: test
      args:
        language: pt
    metrics:
    - name: Test WER (Pt)
      type: wer
      value: 3.96
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: ru
      split: test
      args:
        language: ru
    metrics:
    - name: Test WER (Ru)
      type: wer
      value: 3.00
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: sl
      split: test
      args:
        language: sl
    metrics:
    - name: Test WER (Sl)
      type: wer
      value: 31.80
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: sv
      split: test
      args:
        language: sv
    metrics:
    - name: Test WER (Sv)
      type: wer
      value: 20.16
  - task:
      type: Automatic Speech Recognition
      name: automatic-speech-recognition
    dataset:
      name: CoVoST2
      type: covost2
      config: uk
      split: test
      args:
        language: uk
    metrics:
    - name: Test WER (Uk)
      type: wer
      value: 5.10
metrics:
- wer
---

# **<span style="color:#76b900;">🦜 parakeet-tdt-0.6b-v3: Multilingual Speech-to-Text Model</span>**

<style>
img {
 display: inline;
}
</style>

[![Model architecture](https://img.shields.io/badge/Model_Arch-FastConformer--TDT-blue#model-badge)](#model-architecture)
| [![Model size](https://img.shields.io/badge/Params-0.6B-green#model-badge)](#model-architecture)
| [![Language](https://img.shields.io/badge/Language-EU_Languages-blue#model-badge)](#datasets)

## <span style="color:#466f00;">Description:</span>

`parakeet-tdt-0.6b-v3` is a 600-million-parameter multilingual automatic speech recognition (ASR) model designed for high-throughput speech-to-text transcription. It extends the [parakeet-tdt-0.6b-v2](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2) model by expanding language support from English to 25 European languages. The model automatically detects the language of the audio and transcribes it without requiring additional prompting. It is part of a series of models that leverage the [Granary](https://huggingface.co/datasets/nvidia/Granary) [1, 2] multilingual corpus as their primary training dataset.

🗣️ Try Demo here: https://huggingface.co/spaces/nvidia/parakeet-tdt-0.6b-v3 

**Supported Languages:**  
Bulgarian (**bg**), Croatian (**hr**), Czech (**cs**), Danish (**da**), Dutch (**nl**), English (**en**), Estonian (**et**), Finnish (**fi**), French (**fr**), German (**de**), Greek (**el**), Hungarian (**hu**), Italian (**it**), Latvian (**lv**), Lithuanian (**lt**), Maltese (**mt**), Polish (**pl**), Portuguese (**pt**), Romanian (**ro**), Slovak (**sk**), Slovenian (**sl**), Spanish (**es**), Swedish (**sv**), Russian (**ru**), Ukrainian (**uk**)

This model is ready for commercial/non-commercial use.

## <span style="color:#466f00;">Key Features:</span>

`parakeet-tdt-0.6b-v3`'s key features are built on the foundation of its predecessor, [parakeet-tdt-0.6b-v2](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2), and include:

* Automatic **punctuation** and **capitalization**
* Accurate **word-level** and **segment-level** timestamps
* **Long audio** transcription, supporting audio **up to 24 minutes** long with full attention (on A100 80GB) or up to 3 hours with local attention.
* Released under a **permissive CC BY 4.0 license**

For full details on the model architecture, training methodology, datasets, and evaluation results, check out the **[Technical Report](https://arxiv.org/abs/2509.14128)**.

## <span style="color:#466f00;">License/Terms of Use:</span>

GOVERNING TERMS: Use of this model is governed by the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en) license.

### <span style="color:#466f00;">Discover more from NVIDIA:</span> 
For documentation, deployment guides, enterprise-ready APIs, and the latest open models—including Nemotron and other cutting-edge speech, translation, and generative AI—visit the NVIDIA Developer Portal at developer.nvidia.com.
Join the community to access tools, support, and resources to accelerate your development with NVIDIA’s NeMo, Riva, NIM, and foundation models.<br>

#### <span style="color:#466f00;">Explore more from NVIDIA:</span>  <br>
What is [Nemotron](https://www.nvidia.com/en-us/ai-data-science/foundation-models/nemotron/)?<br>
NVIDIA Developer [Nemotron](https://developer.nvidia.com/nemotron)<br>
[NVIDIA Riva Speech](https://developer.nvidia.com/riva?sortBy=developer_learning_library%2Fsort%2Ffeatured_in.riva%3Adesc%2Ctitle%3Aasc#demos)<br>
[NeMo Documentation](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/models.html)<br>

## Automatic Speech Recognition (ASR) Performance

![ASR WER Comparison](plots/asr.png)

*Figure 1: ASR WER comparison across different models. This does not include Punctuation and Capitalisation errors.*

---

### Evaluation Notes

**Note 1:** The above evaluations are conducted  for 24 supported languages, excluding Latvian since `seamless-m4t-v2-large` and `seamless-m4t-medium` do not support it.

**Note 2:** Performance differences may be partly attributed to Portuguese variant differences - our training data uses European Portuguese while most benchmarks use Brazilian Portuguese.

### <span style="color:#466f00;">Deployment Geography:</span>
Global


### <span style="color:#466f00;">Use Case:</span>

This model serves developers, researchers, academics, and industries building applications that require speech-to-text capabilities, including but not limited to: conversational AI, voice assistants, transcription services, subtitle generation, and voice analytics platforms.


### <span style="color:#466f00;">Release Date:</span>

Huggingface [08/14/2025](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)


### <span style="color:#466f00;">Model Architecture:</span>

**Architecture Type**: 

FastConformer-TDT

**Network Architecture**:

* This model was developed based on [FastConformer encoder](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/main/asr/models.html#fast-conformer) architecture[3] and TDT decoder[4]
* This model has 600 million model parameters.

### <span style="color:#466f00;">Input:</span>
**Input Type(s):** 16kHz Audio
**Input Format(s):** `.wav` and `.flac` audio formats
**Input Parameters:** 1D (audio signal)
**Other Properties Related to Input:**  Monochannel audio

### <span style="color:#466f00;">Output:</span>
**Output Type(s):**  Text
**Output Format:**  String
**Output Parameters:**  1D (text)
**Other Properties Related to Output:** Punctuations and Capitalizations included.

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA's hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions. 

For more information, refer to the [NeMo documentation](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/main/asr/models.html#fast-conformer).

## <span style="color:#466f00;">How to Use this Model:</span>

To train, fine-tune or play with the model you will need to install [NVIDIA NeMo](https://github.com/NVIDIA/NeMo). We recommend you install it after you've installed latest PyTorch version.
```bash
pip install -U nemo_toolkit['asr']
``` 
The model is available for use in the NeMo toolkit [5], and can be used as a pre-trained checkpoint for inference or for fine-tuning on another dataset.

#### Automatically instantiate the model

```python
import nemo.collections.asr as nemo_asr
asr_model = nemo_asr.models.ASRModel.from_pretrained(model_name="nvidia/parakeet-tdt-0.6b-v3")
```

#### Transcribing using Python
First, let's get a sample
```bash
wget https://dldata-public.s3.us-east-2.amazonaws.com/2086-149220-0033.wav
```
Then simply do:
```python
output = asr_model.transcribe(['2086-149220-0033.wav'])
print(output[0].text)
```

#### Transcribing with timestamps

To transcribe with timestamps:
```python
output = asr_model.transcribe(['2086-149220-0033.wav'], timestamps=True)
# by default, timestamps are enabled for char, word and segment level
word_timestamps = output[0].timestamp['word'] # word level timestamps for first sample
segment_timestamps = output[0].timestamp['segment'] # segment level timestamps
char_timestamps = output[0].timestamp['char'] # char level timestamps

for stamp in segment_timestamps:
    print(f"{stamp['start']}s - {stamp['end']}s : {stamp['segment']}")
```

#### Transcribing long-form audio

```python
#updating self-attention model of fast-conformer encoder
#setting attention left and right context sizes to 256
asr_model.change_attention_model(self_attention_model="rel_pos_local_attn", att_context_size=[256, 256])

output = asr_model.transcribe(['2086-149220-0033.wav'])

print(output[0].text)
```

#### Streaming with Parakeet models

To use parakeet models in streaming mode use this [script](https://github.com/NVIDIA/NeMo/blob/main/examples/asr/asr_chunked_inference/rnnt/speech_to_text_streaming_infer_rnnt.py) as shown below:

```bash
python NeMo/main/examples/asr/asr_chunked_inference/rnnt/speech_to_text_streaming_infer_rnnt.py \
    pretrained_name="nvidia/parakeet-tdt-0.6b-v3" \
    model_path=null \
    audio_dir="<optional path to folder of audio files>" \
    dataset_manifest="<optional path to manifest>" \
    output_filename="<optional output filename>" \
    right_context_secs=2.0 \
    chunk_secs=2 \
    left_context_secs=10.0 \
    batch_size=32 \
    clean_groundtruth_text=False
```

NVIDIA NIM for v2 parakeet model is available at [https://build.nvidia.com/nvidia/parakeet-tdt-0_6b-v2](https://build.nvidia.com/nvidia/parakeet-tdt-0_6b-v2).

## <span style="color:#466f00;">Software Integration:</span>

**Runtime Engine(s):**
* NeMo 2.4  


**Supported Hardware Microarchitecture Compatibility:** 
* NVIDIA Ampere
* NVIDIA Blackwell  
* NVIDIA Hopper
* NVIDIA Volta

**[Preferred/Supported] Operating System(s):**

- Linux

**Hardware Specific Requirements:**

Atleast 2GB RAM for model to load. The bigger the RAM, the larger audio input it supports.

#### Model Version

Current version: `parakeet-tdt-0.6b-v3`. Previous versions can be [accessed](https://huggingface.co/collections/nvidia/parakeet-659711f49d1469e51546e021) here. 

## <span style="color:#466f00;">Training and Evaluation Datasets:</span>

### <span style="color:#466f00;">Training</span>

This model was trained using the NeMo toolkit [5], following the strategies below:

- Initialized from a CTC multilingual checkpoint pretrained on the Granary dataset \[1] \[2].  
- Trained for 150,000 steps on 128 A100 GPUs. 
- Dataset corpora and languages were balanced using a temperature sampling value of 0.5.  
- Stage 2 fine-tuning was performed for 5,000 steps on 4 A100 GPUs using approximately 7,500 hours of high-quality, human-transcribed data of NeMo ASR Set 3.0.

Training was conducted using this [example script](https://github.com/NVIDIA/NeMo/blob/main/examples/asr/asr_transducer/speech_to_text_rnnt_bpe.py) and [TDT configuration](https://github.com/NVIDIA/NeMo/blob/main/examples/asr/conf/fastconformer/hybrid_transducer_ctc/fastconformer_hybrid_tdt_ctc_bpe.yaml).

During the training, a unified SentencePiece Tokenizer \[6] with a vocabulary of **8,192 tokens** was used. The unified tokenizer was constructed from the training set transcripts using this [script](https://github.com/NVIDIA/NeMo/blob/main/scripts/tokenizers/process_asr_text_tokenizer.py) and was optimized across all 25 supported languages.

### <span style="color:#466f00;">Training Dataset</span>
The model was trained on the combination of [Granary dataset's ASR subset](https://huggingface.co/datasets/nvidia/Granary) and in-house dataset NeMo ASR Set 3.0:

- 10,000 hours from human-transcribed NeMo ASR Set 3.0, including:
  - LibriSpeech (960 hours)
  - Fisher Corpus
  - National Speech Corpus Part 1 
  - VCTK
  - Europarl-ASR
  - Multilingual LibriSpeech
  - Mozilla Common Voice (v7.0)
  - AMI

- 660,000 hours of pseudo-labeled data from Granary \[1] \[2], including:
  - [YTC](https://huggingface.co/datasets/FBK-MT/mosel) \[7]
  - [MOSEL](https://huggingface.co/datasets/FBK-MT/mosel) \[8]
  - [YODAS](https://huggingface.co/datasets/espnet/yodas-granary) \[9]

All transcriptions preserve punctuation and capitalization. The Granary dataset will be made publicly available after presentation at Interspeech 2025.

**Data Collection Method by dataset**

* Hybrid: Automated, Human

**Labeling Method by dataset**

* Hybrid: Synthetic, Human 

**Properties:**

* Noise robust data from various sources
* Single channel, 16kHz sampled data

#### Evaluation Datasets

For multilingual ASR performance evaluation:
  - Fleurs [10]
  - MLS [11]  
  - CoVoST [12]

For English ASR performance evaluation:
  - Hugging Face Open ASR Leaderboard [13] datasets

**Data Collection Method by dataset**
* Human

**Labeling Method by dataset**
* Human

**Properties:**

* All are commonly used for benchmarking English ASR systems.
* Audio data is typically processed into a 16kHz mono channel format for ASR evaluation, consistent with benchmarks like the [Open ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard).

## <span style="color:#466f00;">Performance</span>

#### Multilingual ASR

The tables below summarizes the WER (%) using a Transducer decoder with greedy decoding (without an external language model):


| Language | Fleurs | MLS | CoVoST |
|----------|--------|-----|--------|
| **Average WER ↓** | *11.97%* | *7.83%* | *11.98%* |
| **bg** | 12.64% | - | - |
| **cs** | 11.01% | - | - |
| **da** | 18.41% | - | - |
| **de** | 5.04% | - | 4.84% |
| **el** | 20.70% | - | - |
| **en** | 4.85% | - | 6.80% |
| **es** | 3.45% | 4.39% | 3.41% |
| **et** | 17.73% | - | 22.04% |
| **fi** | 13.21% | - | - |
| **fr** | 5.15% | 4.97% | 6.05% |
| **hr** | 12.46% | - | - |
| **hu** | 15.72% | - | - |
| **it** | 3.00% | 10.08% | 3.69% |
| **lt** | 20.35% | - | - |
| **lv** | 22.84% | - | 38.36% |
| **mt** | 20.46% | - | - |
| **nl** | 7.48% | 12.78% | 6.50% |
| **pl** | 7.31% | 7.28% | - |
| **pt** | 4.76% | 7.50% | 3.96% |
| **ro** | 12.44% | - | - |
| **ru** | 5.51% | - | 3.00% |
| **sk** | 8.82% | - | - |
| **sl** | 24.03% | - | 31.80% |
| **sv** | 15.08% | - | 20.16% |
| **uk** | 6.79% | - | 5.10% |

**Note:** WERs are calculated after removing Punctuation and Capitalization from reference and predicted text.


#### Huggingface Open-ASR-Leaderboard

| **Model** | **Avg WER** | **AMI** | **Earnings-22** | **GigaSpeech** | **LS test-clean** | **LS test-other** | **SPGI Speech** | **TEDLIUM-v3** | **VoxPopuli** |
|:-------------|:-------------:|:---------:|:------------------:|:----------------:|:-----------------:|:-----------------:|:------------------:|:----------------:|:---------------:|
| `parakeet-tdt-0.6b-v3` | 6.34% | 11.31% | 11.42% | 9.59% | 1.93% | 3.59% | 3.97% | 2.75% | 6.14% |

Additional evaluation details are available on the [Hugging Face ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard).[13]

### Noise Robustness
Performance across different Signal-to-Noise Ratios (SNR) using MUSAN music and noise samples [14]:

| **SNR Level** | **Avg WER** | **AMI** | **Earnings** | **GigaSpeech** | **LS test-clean** | **LS test-other** | **SPGI** | **Tedlium** | **VoxPopuli** | **Relative Change** |
|:---------------|:-------------:|:----------:|:------------:|:----------------:|:-----------------:|:-----------------:|:-----------:|:-------------:|:---------------:|:-----------------:|
| Clean | 6.34% | 11.31% | 11.42% | 9.59% | 1.93% | 3.59% | 3.97% | 2.75% | 6.14% | - |
| SNR 10 | 7.12% | 13.99% | 11.79% | 9.96% | 2.15% | 4.55% | 4.45% | 3.05% | 6.99% | -12.28% |
| SNR 5 | 8.23% | 17.59% | 13.01% | 10.69% | 2.62% | 6.05% | 5.23% | 3.33% | 7.31% | -29.81% |
| SNR 0 | 11.66% | 24.44% | 17.34% | 13.60% | 4.82% | 10.38% | 8.41% | 5.39% | 8.91% | -83.97% |
| SNR -5 | 19.88% | 34.91% | 26.92% | 21.41% | 12.21% | 19.98% | 16.96% | 11.36% | 15.30% | -213.64% |



## <span style="color:#466f00;">References</span>

[1] [Granary: Speech Recognition and Translation Dataset in 25 European Languages](https://arxiv.org/abs/2505.13404)

[2] [NVIDIA Granary Dataset Card](https://huggingface.co/datasets/nvidia/Granary)

[3] [Fast Conformer with Linearly Scalable Attention for Efficient Speech Recognition](https://arxiv.org/abs/2305.05084)

[4] [Efficient Sequence Transduction by Jointly Predicting Tokens and Durations](https://arxiv.org/abs/2304.06795)

[5] [NVIDIA NeMo Toolkit](https://github.com/NVIDIA/NeMo)

[6] [Google Sentencepiece Tokenizer](https://github.com/google/sentencepiece)

[7] [Youtube-Commons](https://huggingface.co/datasets/PleIAs/YouTube-Commons)

[8] [MOSEL: 950,000 Hours of Speech Data for Open-Source Speech Foundation Model Training on EU Languages](https://arxiv.org/abs/2410.01036)

[9] [YODAS: Youtube-Oriented Dataset for Audio and Speech](https://arxiv.org/pdf/2406.00899)

[10] [FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech](https://arxiv.org/abs/2205.12446)

[11] [MLS: A Large-Scale Multilingual Dataset for Speech Research](https://arxiv.org/abs/2012.03411)

[12] [CoVoST 2 and Massively Multilingual Speech-to-Text Translation](https://arxiv.org/abs/2007.10310)

[13] [HuggingFace ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard)

[14] [MUSAN: A Music, Speech, and Noise Corpus](https://arxiv.org/abs/1510.08484)

## <span style="color:#466f00;">Inference:</span>

**Engine**: 
* NVIDIA NeMo

**Test Hardware**:
* NVIDIA A10
* NVIDIA A100
* NVIDIA A30
* NVIDIA H100
* NVIDIA L4
* NVIDIA L40
* NVIDIA Turing T4
* NVIDIA Volta V100

## <span style="color:#466f00;">Ethical Considerations:</span>
NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. When downloaded or used in accordance with our terms of service, developers should work with their supporting model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

For more detailed information on ethical considerations for this model, please see the Model Card++ Explainability, Bias, Safety & Security, and Privacy Subcards [here](https://developer.nvidia.com/blog/enhancing-ai-transparency-and-ethical-considerations-with-model-card/).

Please report security vulnerabilities or NVIDIA AI Concerns [here](https://www.nvidia.com/en-us/support/submit-security-vulnerability/).

## <span style="color:#466f00;">Bias:</span>

Field                                                                                               |  Response
---------------------------------------------------------------------------------------------------|---------------
Participation considerations from adversely impacted groups [protected classes](https://www.senate.ca.gov/content/protected-classes) in model design and testing  |  None
Measures taken to mitigate against unwanted bias    | None

## <span style="color:#466f00;">Explainability:</span>

Field                                                                                                  |  Response
------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------
Intended Domain                                                                   |  Speech to Text Transcription
Model Type                                                                                            |  FastConformer
Intended Users                                                                                        |  This model is intended for developers, researchers, academics, and industries building conversational based applications. 
Output                                                                                                |  Text 
Describe how the model works                                                                          |  Speech input is encoded into embeddings and passed into conformer-based model and output a text response.
Name the adversely impacted groups this has been tested to deliver comparable outcomes regardless of  |  Not Applicable
Technical Limitations & Mitigation                                                                    |  Transcripts may be not 100% accurate. Accuracy varies based on language and characteristics of input audio (Domain, Use Case, Accent, Noise, Speech Type, Context of speech, etc.)
Verified to have met prescribed NVIDIA quality standards  |  Yes
Performance Metrics                                                                                   | Word Error Rate
Potential Known Risks                                                                                 |  If a word is not trained in the language model and not presented in vocabulary, the word is not likely to be recognized. Not recommended for word-for-word/incomplete sentences as accuracy varies based on the context of input text
Licensing                                                                                             |  GOVERNING TERMS: Use of this model is governed by the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en) license.

## <span style="color:#466f00;">Privacy:</span>

Field                                                                                                                              |  Response
----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------
Generatable or reverse engineerable personal data?                                                     |  None
Personal data used to create this model?                                                                                       |  None
Is there provenance for all datasets used in training?                                                                                |  Yes
Does data labeling (annotation, metadata) comply with privacy laws?                                                                |  Yes
Is data compliant with data subject requests for data correction or removal, if such a request was made?                           |  No, not possible with externally-sourced data.
Applicable Privacy Policy        | https://www.nvidia.com/en-us/about-nvidia/privacy-policy/ 

## <span style="color:#466f00;">Safety:</span>

Field                                               |  Response
---------------------------------------------------|----------------------------------
Model Application(s)                               |  Speech to Text Transcription
Describe the life critical impact   |  None
Use Case Restrictions                              | Abide by [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en) License
Model and dataset restrictions            |  The Principle of least privilege (PoLP) is applied limiting access for dataset generation and model development. Restrictions enforce dataset access during training, and dataset license constraints adhered to.