# Fantasy F1 – Spec v1.0

> **Purpose**: Complete, program‑ready description of game logic for the Fantasy F1 application. Give this file to Cursor (or any dev) as single source of truth for back‑end & front‑end implementation.

---

## 1. Core Concepts & Entities

| Entity ("Card")    | Qty 2025                        | Variants                    | Key Fields                                             |
| ------------------ | ------------------------------- | --------------------------- | ------------------------------------------------------ |
| **Pilot‑Session**  | 20 pilots × 3 sessions = **60** | `race`, `qualy`, `practice` | `pilot_id`, `session_type`, `team_id`, `tier`, `price` |
| **Constructor**    | 10                              | –                           | `team_id`, `exp_pos_mean`                              |
| **Chief Engineer** | 10                              | –                           | `team_id`, `exp_pos_mean`                              |
| **Track Engineer** | 20                              | –                           | `engineer_id`, `pilot_id`                              |

**Tier 1 (Top‑pilot list)**: `['VER', 'NOR', 'LEC', 'SAI', 'RUS']`

---

## 2. Squad Composition Rules

```
slots:
  - pilot_race:   2  # max 1 per constructor
  - pilot_qualy:  2  # max 1 per constructor
  - pilot_practice: 1
  - chief_engineer: 1
  - track_engineer: 1  # must match one owned pilot
  - constructor: 1  # optional but recommended
max_cards_per_manager: 8
```

> *Validation*: enforce constructor duplication limits **at save‑team time**.

---

## 3. Scoring Engine

### 3.1 Position Delta

`Δ = expected_position – actual_position`

#### Multipliers by session

| Session        | Δ > 0 (better) | Δ < 0 (worse) | Hard cap |
| -------------- | -------------- | ------------- | -------- |
| **Race**       | `+10 × Δ`      | `−5 × Δ`      | ±50 pts  |
| **Qualifying** | `+6 × Δ`       | `−3 × Δ`      | ±30 pts  |
| **Practice**   | `+2 × Δ`       | `−1 × Δ`      | ±10 pts  |

### 3.2 Event Bonusses & Maluses (race unless noted)

| Event                              | + / − | Applies to        |
| ---------------------------------- | ----- | ----------------- |
| Clean on‑track overtake            | +2    | overtaking pilot  |
| Net positions lost (optional)      | −1    | per pass suffered |
| Positions gained at start (>1 pos) | +3    | race start        |
| Fastest lap (must finish P1–10)    | +5    | one pilot         |
| Causes Virtual SC                  | −5    | culprit           |
| Causes full Safety Car             | −8    | culprit           |
| Causes red flag (any session)      | −12   | culprit           |
| DNF – driver error                 | −10   | culprit           |
| DNF – no fault (mechanical/ hit)   | −3    | pilot             |

> **Implementation**: ingest FIA lap‑by‑lap & incident feed; map events to pilot IDs.

---

## 4. Modifier Cards

### 4.1 Chief Engineer (constructor‑level)

*Inputs*: mean expected constructor position `exp_pos_mean`, mean real `real_mean`.

```
Δ_team = exp_pos_mean - real_mean
if   Δ_team >= 1.5:  +10 pts
elif Δ_team >= 0.5:  +5 pts
elif Δ_team > -0.5:   0 pts
elif Δ_team > -1.5:  -5 pts
else:               -10 pts
```

*No dependency on manager's pilots.*

### 4.2 Track Engineer (synergy booster)

Requires owning the matching pilot‑session card.

```
if pilot_finished_ahead_of_teammate:
    pilot_points *= 1.5
else:
    pilot_points *= 1.2
```

---

## 5. Duo‑Top Rule (anti "double‑ace" exploit)

*Trigger*: manager roster contains **≥2 Tier‑1 pilots** *in any session*.

1. Manager must pre‑GP declare which of those Tier‑1 pilots beats the other **in the Race result**.
2. Resolution:
   - Correct → `+8 pts` bonus
   - Incorrect → `−4 pts` malus
   - No declaration → both Tier‑1 pilots’ final scores × 0.8

> Store prediction in `duo_choice` table keyed by `manager_id, gp_id` and lock Friday 18:00 CET.

---

## 6. Financial System

### 6.1 Prices & Weekly Adjustment

```
new_price = old_price + 0.3 * (weekly_points - 4)
# soft‑cap ±5 % per GP
```

### 6.2 Passive Economy

| Mechanic             | Rule                                         |
| -------------------- | -------------------------------------------- |
| Sponsorship bonus    | `+2 M` if team ≥ 50 pts in a GP              |
| Constructor dividend | `+1 M` if both real cars finish              |
| Salaries             | `3 %` of roster market value deducted weekly |

> *Market* (auctions, buy‑out clauses) **on hold** – not in v1.

---

## 7. Data Model (simplified SQL)

```sql
TABLE pilots (
  pilot_id CHAR(3) PK,
  name TEXT,
  team_id CHAR(3),
  tier INT
);

TABLE cards (
  card_id SERIAL PK,
  pilot_id CHAR(3) NULL,
  session_type ENUM('race','qualy','practice') NULL,
  team_id CHAR(3) NULL,
  card_type ENUM('pilot','constructor','chief_eng','track_eng'),
  price DECIMAL(6,2)
);

TABLE expectations (
  gp_id INT,
  card_id INT,
  exp_position FLOAT,
  PRIMARY KEY (gp_id, card_id)
);

TABLE scores (
  gp_id INT,
  manager_id INT,
  card_id INT,
  raw_points FLOAT,
  final_points FLOAT,
  UNIQUE (gp_id, manager_id, card_id)
);
```

---

## 8. API Endpoints (REST sketch)

| Method                     | Path                | Purpose |
| -------------------------- | ------------------- | ------- |
| `GET /gp/:id/expectations` | baseline positions  |         |
| `POST /team`               | set weekly roster   |         |
| `POST /duo-pick`           | submit Tier‑1 pick  |         |
| `GET /scores/:gp_id`       | fetch final scores  |         |
| `GET /market/prices`       | current card prices |         |

---

## 9. Configuration Constants (YAML excerpt)

```yaml
multipliers:
  race:      { up: 10, down: -5, cap: 50 }
  qualifying:{ up:  6, down: -3, cap: 30 }
  practice:  { up:  2, down: -1, cap: 10 }

track_engineer:
  ahead: 1.5
  behind: 1.2

duo_rule:
  correct_bonus: 8
  wrong_malus: 4
  no_pick_scale: 0.8

chief_engineer:
  thresholds: [1.5, 0.5, -0.5, -1.5]
  scores:     [10, 5, 0, -5, -10]

price_soft_cap: 0.05  # 5 %
```

---

## 10. Open TODOs for v1 Launch

1. **Expectation engine** – choose between moving average of last 6 GPs vs. machine‑learning forecast.
2. **Event ingestion** – map FIA feed to event types & pilot IDs.
3. **UI/UX** – declare Tier‑1 duel pick in Team page.
4. **Admin dashboard** – live edit multipliers without redeploy.
5. **Unit tests** – cover all scoring branches incl. modifiers.

---

### End of Spec

