"""Portuguese -> English for review comments.

Order of attempts for each comment:
1. pipeline/translations_en.json (a saved cache; also holds the built-in sample phrases)
2. an offline model, if `transformers`, `sentencepiece` and `torch` are installed
   (Helsinki-NLP/opus-mt-ROMANCE-en, downloaded once from Hugging Face)
3. otherwise the comment is left in Portuguese.
New translations from step 2 are written to the cache, so a rerun is fast.
"""
from __future__ import annotations
import json
from pathlib import Path

CACHE = Path(__file__).with_name("translations_en.json")

PHRASES = {
    "Produto chegou com muito atraso": "The product arrived very late",
    "Entrega demorou demais, passou do prazo": "Delivery took far too long, past the deadline",
    "Ainda não chegou meu pedido": "My order still hasn't arrived",
    "Atraso na entrega, péssimo atendimento": "Late delivery, terrible service",
    "Demorou mais de um mês para entregar": "It took more than a month to deliver",
    "Prazo estourado e ninguém responde": "Deadline missed and nobody answers",
    "Produto veio com defeito": "The product came defective",
    "Chegou quebrado e de má qualidade": "Arrived broken and poor quality",
    "Qualidade ruim, não recomendo": "Poor quality, I don't recommend it",
    "Material péssimo, estragou rápido": "Terrible material, it broke quickly",
    "Veio com defeito de fábrica": "It had a factory defect",
    "Veio produto errado": "The wrong product came",
    "Faltou um item no pedido": "An item was missing from the order",
    "Produto diferente do anunciado": "Product different from the listing",
    "Recebi só parte do pedido, incompleto": "I only received part of the order, incomplete",
    "Cor errada, não é o que eu pedi": "Wrong colour, not what I ordered",
    "Ótimo produto, chegou antes do prazo": "Great product, arrived before the deadline",
    "Recomendo, qualidade excelente": "I recommend it, excellent quality",
    "Tudo certo, entrega rápida": "All good, fast delivery",
    "Muito bom, superou as expectativas": "Very good, exceeded expectations",
    "Produto igual ao anunciado, adorei": "Product matches the listing, loved it",
    "Chegou rápido e bem embalado": "Arrived fast and well packed",
}
WORDS = {
    "geladeira": "fridge", "celular": "phone", "sofá": "sofa", "tênis": "sneakers", "relógio": "watch",
    "notebook": "laptop", "fone": "headphones", "mochila": "backpack", "panela": "pot", "cadeira": "chair",
    "livro": "book", "camiseta": "t-shirt", "perfume": "perfume", "brinquedo": "toy", "bicicleta": "bicycle",
    "televisão": "television", "impressora": "printer", "colchão": "mattress", "cafeteira": "coffee maker",
    "ventilador": "fan", "vendedor": "seller", "embalagem": "packaging", "atendimento": "service",
    "correios": "postal service", "transportadora": "carrier", "caixa": "box", "nota fiscal": "invoice",
    "troca": "exchange", "reembolso": "refund", "garantia": "warranty", "obrigado": "thank you",
    "loja confiável": "trustworthy shop", "voltarei a comprar": "I will buy again", "nota dez": "ten out of ten",
    "cor": "colour", "tamanho": "size", "bateria": "battery", "controle": "remote",
}


def _builtin(pt: str) -> str | None:
    for p, en in PHRASES.items():
        if pt.startswith(p):
            rest = pt[len(p):].strip()
            if not rest:
                return en
            # filler words and phrases are separated by single spaces
            out, s = [], rest
            while s:
                hit = next((w for w in sorted(WORDS, key=len, reverse=True) if s == w or s.startswith(w + " ")), None)
                if not hit:
                    return None
                out.append(WORDS[hit])
                s = s[len(hit):].strip()
            return en + " (" + ", ".join(out) + ")"
    return None


def translate_all(texts: list[str]) -> dict[str, str]:
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = []
    for t in dict.fromkeys(texts):
        if t in cache:
            continue
        b = _builtin(t)
        if b:
            cache[t] = b
        else:
            todo.append(t)
    if todo:
        try:
            from transformers import MarianMTModel, MarianTokenizer  # type: ignore
            name = "Helsinki-NLP/opus-mt-ROMANCE-en"
            tok, model = MarianTokenizer.from_pretrained(name), MarianMTModel.from_pretrained(name)
            for i in range(0, len(todo), 32):
                batch = todo[i:i + 32]
                enc = tok(batch, return_tensors="pt", padding=True, truncation=True, max_length=256)
                out = tok.batch_decode(model.generate(**enc, max_new_tokens=200), skip_special_tokens=True)
                cache.update(dict(zip(batch, out)))
        except Exception as e:  # model not installed or not downloadable
            print(f"translate: {len(todo)} comments left in Portuguese ({type(e).__name__}). "
                  "pip install transformers sentencepiece torch to translate them.")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0))
    return cache
