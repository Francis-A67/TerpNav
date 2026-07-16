"""Server-side comment moderation.

Policy: casual swearing about buildings/classes is allowed; slurs and
harassment aimed at people are blocked.

Uses better-profanity's wordlist (handles l33t-speak substitutions like
"sh1t") plus a spacing-collapse pass to catch "f u c k"-style evasion.
"""
import re
from better_profanity import profanity

# Casual swearing is allowed.
# 'fvck' is the default-list variant that also matches 'fuck' via letter
# substitution, so it has to be whitelisted alongside the plain forms.
MILD_WHITELIST = [
    'hell', 'damn', 'crap', 'god', 'suck', 'sucks', 'piss', 'pissed',
    'fuck', 'fucked', 'fucking', 'fucks', 'fvck',
    'shit', 'shits', 'shitting', 'shitted', 'bullshit',
]
profanity.load_censor_words(whitelist_words=MILD_WHITELIST)

# Slurs and harassment are always blocked. better-profanity also
# matches l33t-substitution variants of these.
EXTRA_WORDS = [
    'kys', 'kill yourself', 'neck yourself',
    'nigger', 'niggers', 'nigga', 'niggas',
    'faggot', 'faggots', 'fag', 'fags', 'fagging', 'fagot', 'fagots',
    'monkey',
]
profanity.add_censor_words(EXTRA_WORDS)

_NON_ALNUM = re.compile(r'[^a-z0-9]+')


def is_clean(text):
    lowered = text.lower()
    if profanity.contains_profanity(lowered):
        return False
    # Collapse separators so "f.a-g g o t" is checked as "faggot"
    collapsed = _NON_ALNUM.sub('', lowered)
    if collapsed and profanity.contains_profanity(collapsed):
        return False
    return True
