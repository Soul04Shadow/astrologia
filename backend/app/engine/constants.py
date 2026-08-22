SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

SIGN_SANSKRIT = {
    "Aries": "Mesha", "Taurus": "Vrishabha", "Gemini": "Mithuna", "Cancer": "Karka",
    "Leo": "Simha", "Virgo": "Kanya", "Libra": "Tula", "Scorpio": "Vrischika",
    "Sagittarius": "Dhanu", "Capricorn": "Makara", "Aquarius": "Kumbha", "Pisces": "Meena",
}

SIGN_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
]

SIGN_TYPE = [
    "movable", "fixed", "dual", "movable", "fixed", "dual",
    "movable", "fixed", "dual", "movable", "fixed", "dual",
]

NAKSHATRAS = [
    ("Ashwini", "Ketu"), ("Bharani", "Venus"), ("Krittika", "Sun"),
    ("Rohini", "Moon"), ("Mrigashira", "Mars"), ("Ardra", "Rahu"),
    ("Punarvasu", "Jupiter"), ("Pushya", "Saturn"), ("Ashlesha", "Mercury"),
    ("Magha", "Ketu"), ("Purva Phalguni", "Venus"), ("Uttara Phalguni", "Sun"),
    ("Hasta", "Moon"), ("Chitra", "Mars"), ("Swati", "Rahu"),
    ("Vishakha", "Jupiter"), ("Anuradha", "Saturn"), ("Jyeshtha", "Mercury"),
    ("Moola", "Ketu"), ("Purva Ashadha", "Venus"), ("Uttara Ashadha", "Sun"),
    ("Shravana", "Moon"), ("Dhanishta", "Mars"), ("Shatabhisha", "Rahu"),
    ("Purva Bhadrapada", "Jupiter"), ("Uttara Bhadrapada", "Saturn"), ("Revati", "Mercury"),
]

DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
               "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}
DASHA_YEARS_TOTAL = 120.0
DASHA_YEAR_DAYS = 365.25

EXALTATION_SIGN = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6}
DEBILITATION_SIGN = {"Sun": 6, "Moon": 7, "Mars": 3, "Mercury": 11, "Jupiter": 9, "Venus": 5, "Saturn": 0}
MOOLATRIKONA = {"Sun": (4, 0, 20), "Moon": (1, 3, 30), "Mars": (0, 0, 12),
                "Mercury": (5, 15, 20), "Jupiter": (8, 0, 10), "Venus": (6, 0, 15), "Saturn": (10, 0, 20)}
OWN_SIGN = {"Sun": [4], "Moon": [3], "Mars": [0, 7], "Mercury": [2, 5],
            "Jupiter": [8, 11], "Venus": [1, 6], "Saturn": [9, 10]}

COMBUST_ORB = {"Moon": 12.0, "Mars": 17.0, "Mercury": 14.0, "Jupiter": 11.0, "Venus": 10.0, "Saturn": 15.0}

PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]

TITHI_NAMES = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
    "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya",
]

YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarman",
    "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
    "Brahma", "Indra", "Vaidhriti",
]

KARANA_MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"]

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

VAR_LORDS = {"Sunday": "Sun", "Monday": "Moon", "Tuesday": "Mars", "Wednesday": "Mercury",
             "Thursday": "Jupiter", "Friday": "Venus", "Saturday": "Saturn"}
