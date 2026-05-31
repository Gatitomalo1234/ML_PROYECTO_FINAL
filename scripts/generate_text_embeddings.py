import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA, TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
INPUT_PATH = PROCESSED_DIR / "model3_text_ready_dataset.csv"
OUTPUT_PATH = PROCESSED_DIR / "model3_embeddings_dataset.csv"
EMBEDDINGS_PATH = PROCESSED_DIR / "event_text_embeddings_pca.csv"
PCA_REPORT_PATH = PROCESSED_DIR / "event_text_embeddings_pca_report.csv"


def load_text_dataset(path):
    df = pd.read_csv(path)
    if "text_clean" not in df.columns:
        raise ValueError("El dataset debe incluir la columna text_clean.")
    df["text_clean"] = df["text_clean"].fillna("").astype(str)
    return df


def sentence_transformer_embeddings(texts, model_name, batch_size):
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name)
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_numpy=True,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    return embeddings, f"sentence-transformers:{model_name}"


def tfidf_svd_embeddings(texts, n_components, random_state):
    vectorizer = TfidfVectorizer(
        max_features=12000,
        min_df=2,
        max_df=0.95,
        ngram_range=(1, 2),
        stop_words="english",
    )
    svd = TruncatedSVD(n_components=n_components, random_state=random_state)
    pipeline = make_pipeline(vectorizer, svd)
    embeddings = pipeline.fit_transform(texts)
    return embeddings, "tfidf_truncated_svd"


def reduce_with_pca(embeddings, n_components, random_state):
    max_components = min(n_components, embeddings.shape[0], embeddings.shape[1])
    if max_components < 1:
        raise ValueError("No hay suficientes dimensiones para PCA.")

    scaler = StandardScaler()
    scaled = scaler.fit_transform(embeddings)
    pca = PCA(n_components=max_components, random_state=random_state)
    reduced = pca.fit_transform(scaled)
    report = pd.DataFrame(
        {
            "component": [f"emb_pca_{index + 1}" for index in range(max_components)],
            "explained_variance_ratio": pca.explained_variance_ratio_,
            "explained_variance_cumulative": np.cumsum(pca.explained_variance_ratio_),
        }
    )
    return reduced, report


def parse_args():
    parser = argparse.ArgumentParser(description="Genera embeddings/PCA para el Modelo 3 MSI.")
    parser.add_argument("--input", default=str(INPUT_PATH), help="CSV de entrada con text_clean.")
    parser.add_argument("--output", default=str(OUTPUT_PATH), help="CSV final con emb_pca_* anexados.")
    parser.add_argument("--embeddings-output", default=str(EMBEDDINGS_PATH), help="CSV solo con ids y emb_pca_*.")
    parser.add_argument("--report-output", default=str(PCA_REPORT_PATH), help="Reporte de varianza PCA.")
    parser.add_argument("--method", choices=["auto", "sentence-transformers", "tfidf-svd"], default="auto")
    parser.add_argument("--model-name", default="all-MiniLM-L6-v2")
    parser.add_argument("--n-components", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--random-state", type=int, default=42)
    return parser.parse_args()


def main():
    args = parse_args()
    df = load_text_dataset(Path(args.input))
    texts = df["text_clean"].tolist()

    method_used = None
    embeddings = None

    if args.method in {"auto", "sentence-transformers"}:
        try:
            embeddings, method_used = sentence_transformer_embeddings(texts, args.model_name, args.batch_size)
        except Exception as exc:
            if args.method == "sentence-transformers":
                raise
            print(f"[warn] Sentence Transformers no disponible ({exc}). Usando TF-IDF + SVD.")

    if embeddings is None:
        embeddings, method_used = tfidf_svd_embeddings(texts, args.n_components, args.random_state)

    if method_used == "tfidf_truncated_svd":
        reduced = embeddings
        explained = np.nan
        report = pd.DataFrame(
            {
                "component": [f"emb_pca_{index + 1}" for index in range(reduced.shape[1])],
                "explained_variance_ratio": explained,
                "explained_variance_cumulative": explained,
            }
        )
    else:
        reduced, report = reduce_with_pca(embeddings, args.n_components, args.random_state)

    emb_cols = [f"emb_pca_{index + 1}" for index in range(reduced.shape[1])]
    emb_df = pd.DataFrame(reduced, columns=emb_cols)
    id_cols = [column for column in ["event_id", "event_date", "source", "target_msi"] if column in df.columns]
    emb_export = pd.concat([df[id_cols].reset_index(drop=True), emb_df], axis=1)

    final = pd.concat([df.reset_index(drop=True), emb_df], axis=1)
    report.insert(0, "method", method_used)

    final.to_csv(args.output, index=False)
    emb_export.to_csv(args.embeddings_output, index=False)
    report.to_csv(args.report_output, index=False)

    print(f"[ok] Metodo embeddings -> {method_used}")
    print(f"[ok] Dataset Modelo 3 con embeddings ({len(final):,} filas, {len(emb_cols)} comps) -> {args.output}")
    print(f"[ok] Embeddings PCA -> {args.embeddings_output}")
    print(f"[ok] Reporte PCA -> {args.report_output}")


if __name__ == "__main__":
    main()
