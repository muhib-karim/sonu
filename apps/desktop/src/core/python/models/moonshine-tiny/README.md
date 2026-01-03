---
license: mit
language:
- en
library_name: transformers
pipeline_tag: automatic-speech-recognition
arxiv: https://arxiv.org/abs/2410.15608
---
# Moonshine

[[Blog]](https://petewarden.com/2024/10/21/introducing-moonshine-the-new-state-of-the-art-for-speech-to-text/) [[Paper]](https://arxiv.org/abs/2410.15608) [[Installation]](https://github.com/usefulsensors/moonshine/blob/main/README.md) [[Podcast]](https://notebooklm.google.com/notebook/d787d6c2-7d7b-478c-b7d5-a0be4c74ae19/audio)

This is the model card for running the automatic speech recognition (ASR) models (Moonshine models) trained and released by Useful Sensors.

Following [Model Cards for Model Reporting (Mitchell et al.)](https://arxiv.org/abs/1810.03993), we're providing some information about the automatic speech recognition model. More information on how these models were trained and evaluated can be found [in the paper](https://arxiv.org/abs/2410.15608). Note, a lot of the text has been copied verbatim from the [model card](https://github.com/openai/whisper/blob/main/model-card.md) for the Whisper model developed by OpenAI, because both models serve identical purposes, and carry identical risks.

## Usage

Moonshine is supported in Hugging Face 🤗 Transformers. To run the model, first install the Transformers library. For this example, we'll also install 🤗 Datasets to load toy audio dataset from the Hugging Face Hub, and 🤗 Accelerate to reduce the model loading time:

```bash
pip install --upgrade pip
pip install --upgrade transformers datasets[audio]
```

```python
from transformers import MoonshineForConditionalGeneration, AutoProcessor
from datasets import load_dataset, Audio
import torch

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

model = MoonshineForConditionalGeneration.from_pretrained('UsefulSensors/moonshine-tiny').to(device).to(torch_dtype)
processor = AutoProcessor.from_pretrained('UsefulSensors/moonshine-tiny')

dataset = load_dataset("hf-internal-testing/librispeech_asr_dummy", "clean", split="validation")
dataset = dataset.cast_column("audio", Audio(processor.feature_extractor.sampling_rate))
sample = dataset[0]["audio"]

inputs = processor(
    sample["array"], 
    return_tensors="pt",
    sampling_rate=processor.feature_extractor.sampling_rate
)
inputs = inputs.to(device, torch_dtype)

# to avoid hallucination loops, we limit the maximum length of the generated text based expected number of tokens per second
token_limit_factor = 6.5 / processor.feature_extractor.sampling_rate  # Maximum of 6.5 tokens per second
seq_lens = inputs.attention_mask.sum(dim=-1)
max_length = int((seq_lens * token_limit_factor).max().item())

generated_ids = model.generate(**inputs, max_length=max_length)
print(processor.decode(generated_ids[0], skip_special_tokens=True))
```

## Model Details

The Moonshine models are trained for the speech recognition task, capable of transcribing English speech audio into English text. Useful Sensors developed the models to support their business direction of developing real time speech transcription products based on low cost hardware. There are 2 models of different sizes and capabilities, summarized in the following table.

| Size | Parameters | English-only model | Multilingual model |
|:----:|:----------:|:------------------:|:------------------:|
| tiny | 27 M       | ✓                  |                    |
| base | 61 M       | ✓                  |                    |

### Release date

October 2024

### Model type

Sequence-to-sequence ASR (automatic speech recognition) and speech translation model

### Paper & samples

[Paper](https://arxiv.org/abs/2410.15608) / [Blog](https://petewarden.com/2024/10/21/introducing-moonshine-the-new-state-of-the-art-for-speech-to-text/)

## Model Use

### Evaluated Use

The primary intended users of these models are AI developers that want to deploy English speech recognition systems in platforms that are severely constrained in memory capacity and computational resources. We recognize that once models are released, it is impossible to restrict access to only “intended” uses or to draw reasonable guidelines around what is or is not safe use.

The models are primarily trained and evaluated on English ASR task. They may exhibit additional capabilities, particularly if fine-tuned on certain tasks like voice activity detection, speaker classification, or speaker diarization but have not been robustly evaluated in these areas. We strongly recommend that users perform robust evaluations of the models in a particular context and domain before deploying them.

In particular, we caution against using Moonshine models to transcribe recordings of individuals taken without their consent or purporting to use these models for any kind of subjective classification. We recommend against use in high-risk domains like decision-making contexts, where flaws in accuracy can lead to pronounced flaws in outcomes. The models are intended to transcribe English speech, use of the model for classification is not only not evaluated but also not appropriate, particularly to infer human attributes.

## Training Data

The models are trained on 200,000 hours of audio and the corresponding transcripts collected from the internet, as well as datasets openly available and accessible on HuggingFace. The open datasets used are listed in the [the accompanying paper](https://arxiv.org/abs/2410.15608).

## Performance and Limitations

Our evaluations show that, the models exhibit greater accuracy on standard datasets over existing ASR systems of similar sizes. 

However, like any machine learning model, the predictions may include texts that are not actually spoken in the audio input (i.e. hallucination). We hypothesize that this happens because, given their general knowledge of language, the models combine trying to predict the next word in audio with trying to transcribe the audio itself.

In addition, the sequence-to-sequence architecture of the model makes it prone to generating repetitive texts, which can be mitigated to some degree by beam search and temperature scheduling but not perfectly. It is likely that this behavior and hallucinations may be worse for short audio segments, or segments where parts of words are cut off at the beginning or the end of the segment.

## Broader Implications

We anticipate that Moonshine models’ transcription capabilities may be used for improving accessibility tools, especially for real-time transcription. The real value of beneficial applications built on top of Moonshine models suggests that the disparate performance of these models may have real economic implications.

There are also potential dual-use concerns that come with releasing Moonshine. While we hope the technology will be used primarily for beneficial purposes, making ASR technology more accessible could enable more actors to build capable surveillance technologies or scale up existing surveillance efforts, as the speed and accuracy allow for affordable automatic transcription and translation of large volumes of audio communication. Moreover, these models may have some capabilities to recognize specific individuals out of the box, which in turn presents safety concerns related both to dual use and disparate performance. In practice, we expect that the cost of transcription is not the limiting factor of scaling up surveillance projects.

## Citation
If you benefit from our work, please cite us:
```
@misc{jeffries2024moonshinespeechrecognitionlive,
      title={Moonshine: Speech Recognition for Live Transcription and Voice Commands}, 
      author={Nat Jeffries and Evan King and Manjunath Kudlur and Guy Nicholson and James Wang and Pete Warden},
      year={2024},
      eprint={2410.15608},
      archivePrefix={arXiv},
      primaryClass={cs.SD},
      url={https://arxiv.org/abs/2410.15608}, 
}
```
