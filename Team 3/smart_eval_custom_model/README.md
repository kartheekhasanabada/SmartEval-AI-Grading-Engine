---
language:
- en
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- dense
- generated_from_trainer
- dataset_size:5749
- loss:CosineSimilarityLoss
base_model: sentence-transformers/all-MiniLM-L6-v2
widget:
- source_sentence: The man is shooting an automatic rifle.
  sentences:
  - A man is shooting a gun.
  - A man is driving a car.
  - A man is dancing.
- source_sentence: A woman is riding on a horse.
  sentences:
  - A woman is picking tomatoes.
  - A man is chopping a tree trunk with an axe.
  - A man is cutting and onion.
- source_sentence: A man is walking outside.
  sentences:
  - An animal is walking on the ground.
  - Dogs are swimming in a pool.
  - A man is dancing.
- source_sentence: A woman is riding a motorized scooter down a road.
  sentences:
  - A girl loses her kite.
  - A woman is peeling a potato.
  - A man is riding a motor scooter.
- source_sentence: A girl is eating a cupcake.
  sentences:
  - A woman is eating a cupcake.
  - Zebras are socializing.
  - A man is skating.
datasets:
- nyu-mll/glue
pipeline_tag: sentence-similarity
library_name: sentence-transformers
---

# SentenceTransformer based on sentence-transformers/all-MiniLM-L6-v2

This is a [sentence-transformers](https://www.SBERT.net) model finetuned from [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) on the [glue](https://huggingface.co/datasets/glue) dataset. It maps sentences & paragraphs to a 384-dimensional dense vector space and can be used for semantic textual similarity, semantic search, paraphrase mining, text classification, clustering, and more.

## Model Details

### Model Description
- **Model Type:** Sentence Transformer
- **Base model:** [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) <!-- at revision c9745ed1d9f207416be6d2e6f8de32d1f16199bf -->
- **Maximum Sequence Length:** 256 tokens
- **Output Dimensionality:** 384 dimensions
- **Similarity Function:** Cosine Similarity
- **Training Dataset:**
    - [glue](https://huggingface.co/datasets/glue)
- **Language:** en
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/huggingface/sentence-transformers)
- **Hugging Face:** [Sentence Transformers on Hugging Face](https://huggingface.co/models?library=sentence-transformers)

### Full Model Architecture

```
SentenceTransformer(
  (0): Transformer({'max_seq_length': 256, 'do_lower_case': False, 'architecture': 'BertModel'})
  (1): Pooling({'word_embedding_dimension': 384, 'pooling_mode_cls_token': False, 'pooling_mode_mean_tokens': True, 'pooling_mode_max_tokens': False, 'pooling_mode_mean_sqrt_len_tokens': False, 'pooling_mode_weightedmean_tokens': False, 'pooling_mode_lasttoken': False, 'include_prompt': True})
  (2): Normalize()
)
```

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```

Then you can load this model and run inference.
```python
from sentence_transformers import SentenceTransformer

# Download from the 🤗 Hub
model = SentenceTransformer("sentence_transformers_model_id")
# Run inference
sentences = [
    'A girl is eating a cupcake.',
    'A woman is eating a cupcake.',
    'Zebras are socializing.',
]
embeddings = model.encode(sentences)
print(embeddings.shape)
# [3, 384]

# Get the similarity scores for the embeddings
similarities = model.similarity(embeddings, embeddings)
print(similarities)
# tensor([[ 1.0000,  0.7199, -0.0062],
#         [ 0.7199,  1.0000,  0.0127],
#         [-0.0062,  0.0127,  1.0000]])
```

<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### glue

* Dataset: [glue](https://huggingface.co/datasets/glue) at [bcdcba7](https://huggingface.co/datasets/glue/tree/bcdcba79d07bc864c1c254ccfcedcce55bcc9a8c)
* Size: 5,749 training samples
* Columns: <code>sentence1</code>, <code>sentence2</code>, and <code>score</code>
* Approximate statistics based on the first 1000 samples:
  |         | sentence1                                                                        | sentence2                                                                        | score                                                          |
  |:--------|:---------------------------------------------------------------------------------|:---------------------------------------------------------------------------------|:---------------------------------------------------------------|
  | type    | string                                                                           | string                                                                           | float                                                          |
  | details | <ul><li>min: 6 tokens</li><li>mean: 10.0 tokens</li><li>max: 28 tokens</li></ul> | <ul><li>min: 5 tokens</li><li>mean: 9.95 tokens</li><li>max: 25 tokens</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.45</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence1                                                  | sentence2                                                             | score                           |
  |:-----------------------------------------------------------|:----------------------------------------------------------------------|:--------------------------------|
  | <code>A plane is taking off.</code>                        | <code>An air plane is taking off.</code>                              | <code>1.0</code>                |
  | <code>A man is playing a large flute.</code>               | <code>A man is playing a flute.</code>                                | <code>0.7599999904632568</code> |
  | <code>A man is spreading shreded cheese on a pizza.</code> | <code>A man is spreading shredded cheese on an uncooked pizza.</code> | <code>0.7599999904632568</code> |
* Loss: [<code>CosineSimilarityLoss</code>](https://sbert.net/docs/package_reference/sentence_transformer/losses.html#cosinesimilarityloss) with these parameters:
  ```json
  {
      "loss_fct": "torch.nn.modules.loss.MSELoss"
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `warmup_steps`: 100

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `per_device_train_batch_size`: 8
- `num_train_epochs`: 3
- `max_steps`: -1
- `learning_rate`: 5e-05
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: None
- `warmup_steps`: 100
- `optim`: adamw_torch_fused
- `optim_args`: None
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `optim_target_modules`: None
- `gradient_accumulation_steps`: 1
- `average_tokens_across_devices`: True
- `max_grad_norm`: 1.0
- `label_smoothing_factor`: 0.0
- `bf16`: False
- `fp16`: False
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `use_liger_kernel`: False
- `liger_kernel_config`: None
- `use_cache`: False
- `neftune_noise_alpha`: None
- `torch_empty_cache_steps`: None
- `auto_find_batch_size`: False
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `include_num_input_tokens_seen`: no
- `log_level`: passive
- `log_level_replica`: warning
- `disable_tqdm`: False
- `project`: huggingface
- `trackio_space_id`: trackio
- `eval_strategy`: no
- `per_device_eval_batch_size`: 8
- `prediction_loss_only`: True
- `eval_on_start`: False
- `eval_do_concat_batches`: True
- `eval_use_gather_object`: False
- `eval_accumulation_steps`: None
- `include_for_metrics`: []
- `batch_eval_metrics`: False
- `save_only_model`: False
- `save_on_each_node`: False
- `enable_jit_checkpoint`: False
- `push_to_hub`: False
- `hub_private_repo`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_always_push`: False
- `hub_revision`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `restore_callback_states_from_checkpoint`: False
- `full_determinism`: False
- `seed`: 42
- `data_seed`: None
- `use_cpu`: False
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `parallelism_config`: None
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `dataloader_prefetch_factor`: None
- `remove_unused_columns`: True
- `label_names`: None
- `train_sampling_strategy`: random
- `length_column_name`: length
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `ddp_backend`: None
- `ddp_timeout`: 1800
- `fsdp`: []
- `fsdp_config`: {'min_num_params': 0, 'xla': False, 'xla_fsdp_v2': False, 'xla_fsdp_grad_ckpt': False}
- `deepspeed`: None
- `debug`: []
- `skip_memory_metrics`: True
- `do_predict`: False
- `resume_from_checkpoint`: None
- `warmup_ratio`: None
- `local_rank`: -1
- `prompts`: None
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: proportional
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Training Logs
| Epoch  | Step | Training Loss |
|:------:|:----:|:-------------:|
| 0.0695 | 50   | 0.0286        |
| 0.1391 | 100  | 0.0217        |
| 0.2086 | 150  | 0.0266        |
| 0.2782 | 200  | 0.0229        |
| 0.3477 | 250  | 0.0219        |
| 0.4172 | 300  | 0.0243        |
| 0.4868 | 350  | 0.0223        |
| 0.5563 | 400  | 0.0225        |
| 0.6259 | 450  | 0.0230        |
| 0.6954 | 500  | 0.0236        |
| 0.7650 | 550  | 0.0221        |
| 0.8345 | 600  | 0.0180        |
| 0.9040 | 650  | 0.0214        |
| 0.9736 | 700  | 0.0202        |
| 1.0431 | 750  | 0.0161        |
| 1.1127 | 800  | 0.0096        |
| 1.1822 | 850  | 0.0098        |
| 1.2517 | 900  | 0.0114        |
| 1.3213 | 950  | 0.0105        |
| 1.3908 | 1000 | 0.0111        |
| 1.4604 | 1050 | 0.0096        |
| 1.5299 | 1100 | 0.0104        |
| 1.5994 | 1150 | 0.0110        |
| 1.6690 | 1200 | 0.0119        |
| 1.7385 | 1250 | 0.0096        |
| 1.8081 | 1300 | 0.0118        |
| 1.8776 | 1350 | 0.0118        |
| 1.9471 | 1400 | 0.0112        |
| 2.0167 | 1450 | 0.0095        |
| 2.0862 | 1500 | 0.0062        |
| 2.1558 | 1550 | 0.0071        |
| 2.2253 | 1600 | 0.0063        |
| 2.2949 | 1650 | 0.0065        |
| 2.3644 | 1700 | 0.0063        |
| 2.4339 | 1750 | 0.0069        |
| 2.5035 | 1800 | 0.0066        |
| 2.5730 | 1850 | 0.0078        |
| 2.6426 | 1900 | 0.0069        |
| 2.7121 | 1950 | 0.0059        |
| 2.7816 | 2000 | 0.0065        |
| 2.8512 | 2050 | 0.0065        |
| 2.9207 | 2100 | 0.0072        |
| 2.9903 | 2150 | 0.0072        |


### Framework Versions
- Python: 3.10.11
- Sentence Transformers: 5.3.0
- Transformers: 5.5.0
- PyTorch: 2.11.0+cpu
- Accelerate: 1.13.0
- Datasets: 4.8.4
- Tokenizers: 0.22.2

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->