# Smaran Patterns

## Fixture Discipline Rule

Test fixtures may only populate columns through the same write paths production uses.
Do not directly inject values into database columns (e.g., `events.last_performed_year`) that production code does not have a write path for.
This ensures tests accurately reflect the limitations and state of the production environment.
