import streamlit as st

st.set_page_config(page_title="Learning Preferences Finder (VARK)", layout="centered")

st.title("Learning Preferences Finder (VARK-style)")
st.write(
    "This tool estimates learning *preferences* across: **Visual**, **Aural (Auditory)**, "
    "**Read/Write**, **Kinesthetic (Hands-on)**. "
    "Use the results to pick study tactics you will actually do."
)

with st.expander("Evidence note", expanded=False):
    st.write(
        "- Research does not strongly support that matching instruction to a single declared style improves outcomes.\n"
        "- Preferences can still help you choose practical study methods.\n"
        "- Best practice is usually **multimodal** plus **retrieval practice** (self-testing)."
    )

QUESTIONS = [
    {
        "q": "When learning something new, what helps you most at the start?",
        "opts": {
            "A diagram, flowchart, or picture of the big idea": "V",
            "Someone explaining it out loud (live or audio)": "A",
            "A written overview you can reread and annotate": "R",
            "A quick example you can try or simulate yourself": "K",
        },
    },
    {
        "q": "If you’re trying to remember steps in a process, you prefer to:",
        "opts": {
            "Visualize the steps as a map or sequence of images": "V",
            "Talk through the steps with someone (or to yourself)": "A",
            "Write the steps as a numbered list": "R",
            "Do the steps repeatedly until it becomes automatic": "K",
        },
    },
    {
        "q": "When you’re confused, your next move is usually to:",
        "opts": {
            "Look for a chart, sketch, or visual summary": "V",
            "Ask someone to explain it differently": "A",
            "Search for a clearer written explanation": "R",
            "Try a hands-on exercise to see it work": "K",
        },
    },
    {
        "q": "You learn a new app/tool fastest when you:",
        "opts": {
            "Watch a short screen recording and follow along visually": "V",
            "Hear someone walk you through it step-by-step": "A",
            "Read the documentation or a written guide": "R",
            "Click around and learn by experimenting": "K",
        },
    },
    {
        "q": "For studying, you’re most likely to stick with:",
        "opts": {
            "Visual notes with icons, arrows, and color cues": "V",
            "Explaining concepts out loud or using voice notes": "A",
            "Outlines, summaries, and written flashcards": "R",
            "Practice problems, drills, labs, or real-life tasks": "K",
        },
    },
    {
        "q": "When recalling information, you often notice:",
        "opts": {
            "You remember how a page or diagram looked": "V",
            "You remember what was said and the phrasing": "A",
            "You remember exact wording or definitions": "R",
            "You remember what you did or the example you worked": "K",
        },
    },
    {
        "q": "If you had to teach someone else, you’d naturally:",
        "opts": {
            "Draw it out or use a visual model": "V",
            "Explain it verbally and invite questions": "A",
            "Give them a written handout or step-by-step notes": "R",
            "Demonstrate it and let them try": "K",
        },
    },
    {
        "q": "When you need to focus, you prefer:",
        "opts": {
            "A clean visual workspace and visual structure": "V",
            "Silence or steady background sound": "A",
            "Text-based structure (checklists, written plan)": "R",
            "Movement breaks or a tactile setup (index cards, whiteboard)": "K",
        },
    },
    {
        "q": "For learning a new concept, the best resource is usually:",
        "opts": {
            "Infographics, diagrams, or animations": "V",
            "Podcasts, lectures, or discussion": "A",
            "Books, articles, or written tutorials": "R",
            "Workshops, projects, or guided practice": "K",
        },
    },
    {
        "q": "When preparing for a test, you’re most confident if you’ve:",
        "opts": {
            "Reviewed diagrams and visual summaries": "V",
            "Explained it out loud without notes": "A",
            "Written a condensed cheat-sheet from memory": "R",
            "Done practice questions or applied it in scenarios": "K",
        },
    },
    {
        "q": "If directions are complicated, you’d rather receive them as:",
        "opts": {
            "A map or visual route": "V",
            "Someone telling you the steps": "A",
            "A written list you can follow": "R",
            "Landmarks plus trying it once to learn it": "K",
        },
    },
    {
        "q": "When learning from a class, you most value:",
        "opts": {
            "Slides or whiteboard visuals": "V",
            "Discussion and Q&A": "A",
            "Clear notes, handouts, or a follow-up summary": "R",
            "Exercises, role-plays, or real examples": "K",
        },
    },
]

LABELS = {"V": "Visual", "A": "Aural (Auditory)", "R": "Read/Write", "K": "Kinesthetic (Hands-on)"}

TIPS = {
    "V": [
        "Make **mind maps**, diagrams, and one-page visual summaries.",
        "Convert paragraphs into **boxes and arrows**.",
        "Recreate the diagram from memory (retrieval practice).",
    ],
    "A": [
        "Explain concepts out loud as if teaching someone.",
        "Use **voice notes** and replay your summaries.",
        "Add a short **discussion** or Q&A to lock it in.",
    ],
    "R": [
        "Write a one-page summary, then compress it to 10 bullets.",
        "Use written flashcards and self-test.",
        "Rewrite complex ideas in plain language.",
    ],
    "K": [
        "Do practice problems, drills, labs, or mini-projects.",
        "Use scenarios and ask: “What would I do if...?”",
        "Demonstrate, then do it yourself immediately.",
    ],
}

st.subheader("Questionnaire")

scores = {"V": 0, "A": 0, "R": 0, "K": 0}

with st.form("vark_form"):
    responses = []
    for i, item in enumerate(QUESTIONS, start=1):
        st.markdown(f"**{i}. {item['q']}**")
        choice = st.radio(
            label=f"q{i}",
            options=list(item["opts"].keys()),
            index=None,
            label_visibility="collapsed",
        )
        responses.append(item["opts"][choice] if choice else None)
        st.write("")

    submitted = st.form_submit_button("See my results")

if submitted:
    if any(choice is None for choice in responses):
        st.warning("Please answer every question before viewing results.")
        st.stop()

    for code in responses:
        scores[code] += 1

    total = sum(scores.values())
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    st.subheader("Results")
    for code, val in ranked:
        pct = round((val / total) * 100)
        st.write(f"- **{LABELS[code]}**: **{val}** / {total} ({pct}%)")

    top_code, top_val = ranked[0]
    top_label = LABELS[top_code]

    st.markdown(f"### Primary preference: **{top_label}**")

    if len(ranked) > 1:
        _, second_val = ranked[1]
        if top_val - second_val <= 1:
            st.info("You look **multimodal** (top categories are close). A mixed approach often works best.")

    st.markdown("### Tactics to try this week")
    for tip in TIPS[top_code]:
        st.write(f"- {tip}")

    st.markdown("### Universal best practices")
    st.write(
        "- Use **retrieval practice** (self-testing) no matter your preference.\n"
        "- Mix modalities: read a short summary, say it out loud, sketch structure, then apply with questions.\n"
        "- If it is a skill, prioritize practice and feedback."
    )
