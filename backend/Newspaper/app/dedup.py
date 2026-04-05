from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# def deduplicate(articles):
#     texts = [a["title"] for a in articles]

#     vectorizer = TfidfVectorizer().fit_transform(texts)
#     sim = cosine_similarity(vectorizer)

#     unique = []
#     seen = set()

#     for i in range(len(articles)):
#         if i in seen:
#             continue
#         unique.append(articles[i])
#         for j in range(i + 1, len(articles)):
#             if sim[i][j] > 0.8:
#                 seen.add(j)

#     return unique

def deduplicate(articles):
    if not articles:
        return []

    texts = [a["title"] for a in articles if a.get("title")]

    # If too few valid texts → skip dedup
    if len(texts) < 2:
        return articles

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer().fit_transform(texts)
        sim = cosine_similarity(vectorizer)

        unique = []
        seen = set()

        for i in range(len(articles)):
            if i in seen:
                continue
            unique.append(articles[i])

            for j in range(i + 1, len(articles)):
                if sim[i][j] > 0.8:
                    seen.add(j)

        return unique

    except Exception as e:
        print("Dedup failed:", e)
        return articles