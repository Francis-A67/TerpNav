"""Server-side comment moderation.

Uses better-profanity's wordlist (handles l33t-speak substitutions like
"sh1t") plus a spacing-collapse pass to catch "f u c k"-style evasion.
"""
import re
from better_profanity import profanity

# Mild words students use constantly — not worth rejecting a comment over.
MILD_WHITELIST = ['hell', 'damn', 'crap', 'god', 'suck', 'sucks', 'piss', 'pissed']
profanity.load_censor_words(whitelist_words=MILD_WHITELIST)

# Extra terms not in the default list — slurs/harassment aimed at people.
EXTRA_WORDS = [
    'kys', 'kill yourself', 'neck yourself',
]
profanity.add_censor_words(EXTRA_WORDS)

_NON_ALNUM = re.compile(r'[^a-z0-9]+')


def is_clean(text):
    lowered = text.lower()
    if profanity.contains_profanity(lowered):
        return False
    # Collapse separators so "f.u-c k" is checked as "fuck"
    collapsed = _NON_ALNUM.sub('', lowered)
    if collapsed and profanity.contains_profanity(collapsed):
        return False
    return True
