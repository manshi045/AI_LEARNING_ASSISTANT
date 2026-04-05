# from app.summarizer import call_llm

# # def generate_qa(text):
# #     prompt = f"""
# # Generate 10+ UPSC questions:

# # - 8 Prelims MCQs (with answers)
# # - 5 Mains questions (150 words answers)

# # Also include:
# # - Explanation
# # - Relevant concepts

# # Content:
# # {text}
# # """
# #     return call_llm(prompt)

# def generate_qa(text):
#     prompt = f"""
# Generate UPSC questions based on this:

# - 5 Prelims MCQs
# - 3 Mains questions (150 words)

# Content:
# {text[:6000]}
# """
#     return call_llm(prompt)
from app.summarizer import call_llm

def generate_qa(texts):
    combined_text = "\n\n".join(texts[:5])  # limit articles

#     prompt = f"""
# You are a UPSC examiner.

# Based ONLY on the following news articles, generate:

# - 8 Prelims MCQs (with answers)
# - 5 Mains questions (150-word answers)

# STRICT RULES:
# - Questions must be derived ONLY from given content
# - No external knowledge
# - No generic questions
# - Focus on factual + analytical aspects

# Content:
# {combined_text[:12000]}
# """

    prompt = f"""
You are a UPSC examiner.

Generate:
- 8 Prelims MCQs
- 5 Mains questions (150 words)

STRICT RULES:
- ONLY use information explicitly present in the given articles
- DO NOT add any external knowledge
- DO NOT ask static theory questions
- Every question must reference a fact, event, person, or data point from the articles
- Focus on current affairs relevance

GOOD EXAMPLE:
"Recently Andhra Pradesh government bridged a revenue gap of ₹8,238 crore. This is related to which sector?"

BAD EXAMPLE:
"What is Fundamental Rights?"

Content:
{combined_text[:12000]}
"""
    return call_llm(prompt)