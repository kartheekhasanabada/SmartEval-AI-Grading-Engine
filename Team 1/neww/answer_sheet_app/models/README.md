# models/

Place your trained CRNN weights file here:

```
models/
└── crnn_weights.pth   ← your trained model weights
```

## How to generate weights

From your Jupyter notebook, after training:

```python
torch.save(model.state_dict(), 'crnn_weights.pth')
```

Then copy `crnn_weights.pth` into this folder.

## Demo mode (no weights)

If `crnn_weights.pth` is not present, the pipeline runs with a
randomly-initialised CRNN. Confidence will be very low (~0.01),
which triggers the Gemini Vision fallback automatically.
This is the expected behaviour when demoing without trained weights.
