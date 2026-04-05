import requests
from app.config import GROQ_API_KEY
import time
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json"
}

def call_llm(prompt):
    data = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        res = requests.post(GROQ_URL, headers=HEADERS, json=data)
        response_json = res.json()

        # # DEBUG: print full response
        # print("Groq Response:", response_json)

        # if "choices" not in response_json:
        #     return f"LLM Error: {response_json}"
        if "error" in response_json:
            if response_json["error"]["code"] == "rate_limit_exceeded":
                print("⏳ Rate limit hit, retrying...")
                time.sleep(15)
                return call_llm(prompt)

            return f"LLM Error: {response_json}"

        return response_json["choices"][0]["message"]["content"]

    except Exception as e:
        return f"Exception: {str(e)}"


def chunk_text(text, size=2000):
    return [text[i:i+size] for i in range(0, len(text), size)]


# def summarize_articles(texts):
#     mini_summaries = []

#     for text in texts:
#         chunks = chunk_text(text)

#         for chunk in chunks:
#             prompt = f"Summarize this news briefly:\n{chunk}"
#             mini_summaries.append(call_llm(prompt))

#     combined = "\n".join(mini_summaries)

#     final_prompt = f"""
# You are a UPSC expert.

# Create:
# 1. Key Facts
# 2. Background
# 3. UPSC Importance
# 4. Keywords

# Content:
# {combined}
# """

#     return call_llm(final_prompt)
def summarize_articles(texts):
    combined_text = "\n\n".join(texts[:5])  # limit input

    prompt = f"""
You are a UPSC expert.

Analyze the following news articles and generate:

1. Key Facts
2. Background
3. UPSC Importance
4. Keywords

Content:
{combined_text[:12000]}
"""

    return call_llm(prompt)