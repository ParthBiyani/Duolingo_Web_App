"""Game rules as pure functions.

Nothing in this package touches the database, the network or the system clock. Callers pass
in the current instant (``now``) or the learner's local date (``today``), which keeps every
rule deterministic and easy to unit-test with fixed values.
"""
