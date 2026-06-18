# Math Practice — Category Configuration

This file is the **single source of truth** for all question categories on the website.
To add a new category or modify an existing one, edit this file and ask Manus to "regenerate from CATEGORIES.md".

---

## How to use this file

Each category is defined as a level-2 heading (`## Category Name`) followed by a set of
key-value fields and, for word-problem types, a `### Scenarios` section listing scenario templates.

### Field reference

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique machine-readable key, lowercase with hyphens (e.g. `linear-equation`) |
| `label` | Yes | Display name shown in the sidebar |
| `sublabel` | Yes | Short subtitle shown under the label in the sidebar |
| `type` | Yes | Generation strategy — see **Supported types** below |
| `icon` | Yes | Icon name from [lucide-react](https://lucide.dev/icons/) |
| `description` | No | One-sentence description shown in the formula reference card |
| `params` | Yes | Generation parameters — depends on `type` (see per-type docs below) |
| `difficulty` | No | Default difficulty: `easy`, `medium`, or `hard`. Defaults to `medium` if omitted. |

### Supported types

| Type | What it generates | Answer format |
|---|---|---|
| `linear-equation` | One-variable linear equations with integer coefficients — solve for x | Integer |
| `combo-permu` | Combination and permutation word problems using scenario templates | Integer |
| `quadratic-equation` | Quadratic equations with integer roots — find both roots | Two integers (either order) |

### Difficulty system

Each category defines **three difficulty tiers** inside its `### Difficulty Levels` section.
Each tier has its own `params` block that overrides the category defaults.

You can also provide **example questions** as a calibration anchor — these show Manus exactly
what "medium" looks like for your category so the generator can scale easy/hard relative to it.

| Difficulty | Intent |
|---|---|
| `easy` | Straightforward, minimal steps, small numbers — good for warm-up |
| `medium` | Standard practice — the baseline you calibrate with example questions |
| `hard` | Multi-step, larger numbers, less obvious structure |

---

## Category: Linear Equations

- **id:** `linear-equation`
- **label:** Linear Equations
- **sublabel:** Solve for x
- **type:** `linear-equation`
- **icon:** `Calculator`
- **description:** One-variable linear equations with integer coefficients. Isolate x and enter the integer value.
- **difficulty:** `medium`

### Difficulty Levels

#### Easy
Simple one-step equations. Small positive coefficients and constants.

```
coeff_min: 1
coeff_max: 5
const_min: 1
const_max: 10
x_min: 1
x_max: 10
forms:
  - simple        # ax + b = c  (one step)
```

**Example (easy):**
> 3x = 12
> Answer: x = 4

#### Medium ← calibration anchor
Two-step equations, may include negative numbers, parentheses, or fractions.

```
coeff_min: -6
coeff_max: 6
const_min: -10
const_max: 10
x_min: -10
x_max: 10
forms:
  - simple          # ax + b = c
  - two-sided       # ax + b = cx + d
  - parentheses     # a(x + b) = c
  - fraction        # ax/b + c = d
```

**Example (medium):**
> 2(x − 3) = 4x + 6
> Answer: x = −6

#### Hard
Multi-step, variables on both sides, larger coefficients, negative results.

```
coeff_min: -12
coeff_max: 12
const_min: -20
const_max: 20
x_min: -15
x_max: 15
forms:
  - two-sided       # ax + b = cx + d  (larger range)
  - parentheses     # a(x + b) = cx + d
  - fraction        # ax/b + c = dx/e + f
```

**Example (hard):**
> 5(2x − 7) = 3x + 14
> Answer: x = 7

### Quick Tips (shown in the reference card)

1. Move all x terms to one side, constants to the other.
2. Distribute any parentheses first.
3. Divide both sides by the coefficient of x.

---

## Category: Combinations & Permutations

- **id:** `combo-permu`
- **label:** Combinations & Permutations
- **sublabel:** Word problems
- **type:** `combo-permu`
- **icon:** `Shuffle`
- **description:** Real-world word problems requiring you to decide whether order matters (permutation) or not (combination), then compute the result.
- **difficulty:** `medium`

### Difficulty Levels

#### Easy
Small n and r values. Results are small enough to compute mentally.

```
n_min: 4
n_max: 7
r_min: 2
r_max: 2
```

**Example (easy):**
> A teacher selects 2 students from a class of 5 to form a pair. How many different pairs are possible?
> Answer: C(5, 2) = 10

#### Medium ← calibration anchor
Moderate n and r. Requires careful factorial computation.

```
n_min: 5
n_max: 12
r_min: 2
r_max: 4
```

**Example (medium):**
> A club has 8 members. They need to fill 3 distinct officer roles. How many ways can these roles be assigned?
> Answer: P(8, 3) = 336

#### Hard
Larger n and r values. Results require multi-step factorial arithmetic.

```
n_min: 10
n_max: 20
r_min: 3
r_max: 6
```

**Example (hard):**
> A museum has 15 paintings to display. They have wall space for 5 paintings in a row. How many different arrangements are possible?
> Answer: P(15, 5) = 360360

### Formula Reference (shown in the reference card)

- **Combination (order doesn't matter):** C(n, r) = n! / (r! × (n-r)!)
- **Permutation (order matters):** P(n, r) = n! / (n-r)!

### Scenarios

Each scenario is tagged with either `[combination]` or `[permutation]`.
The placeholders `{n}` and `{r}` are replaced with the generated values at runtime.
The `answer` line is for documentation only — the code computes it automatically.

---

#### Scenario C1 [combination]

> A teacher wants to select {r} students from a class of {n} to form a study group. How many different groups can be formed?

- **Hint:** Since the order of selection doesn't matter, use the combination formula C(n, r) = n! / (r! × (n-r)!).
- **Solution:** Order doesn't matter (it's a group), so use combinations. C({n}, {r}) = {n}! / ({r}! × {n-r}!) = {answer}

---

#### Scenario C2 [combination]

> A pizza shop offers {n} different toppings. A customer wants to choose {r} toppings for their pizza. How many different topping combinations are possible?

- **Hint:** The order of toppings doesn't matter, so use combinations: C({n}, {r}).
- **Solution:** Order doesn't matter (toppings on a pizza), so use combinations. C({n}, {r}) = {n}! / ({r}! × {n-r}!) = {answer}

---

#### Scenario C3 [combination]

> A committee of {r} people is to be chosen from a group of {n} volunteers. How many different committees are possible?

- **Hint:** Committee members have equal standing, so order doesn't matter. Use C({n}, {r}).
- **Solution:** A committee has no ranked positions, so order doesn't matter. Use combinations. C({n}, {r}) = {n}! / ({r}! × {n-r}!) = {answer}

---

#### Scenario C4 [combination]

> A bookshelf has {n} different books. You want to pick {r} books to take on a trip. How many ways can you choose the books?

- **Hint:** Choosing which books to bring (not their order) means combinations: C({n}, {r}).
- **Solution:** You're just choosing which books to take, not arranging them. Use combinations. C({n}, {r}) = {n}! / ({r}! × {n-r}!) = {answer}

---

#### Scenario C5 [combination]

> A bag contains {n} different colored marbles. You randomly draw {r} marbles. How many different sets of marbles could you draw?

- **Hint:** A set of drawn marbles is unordered, so use C({n}, {r}).
- **Solution:** A drawn set is unordered, so use combinations. C({n}, {r}) = {n}! / ({r}! × {n-r}!) = {answer}

---

#### Scenario P1 [permutation]

> In a race with {n} runners, how many different ways can the top {r} finishing positions be awarded?

- **Hint:** The finishing positions are ranked, so order matters. Use P({n}, {r}).
- **Solution:** Order matters (1st, 2nd, 3rd are different), so use permutations. P({n}, {r}) = {n}! / ({n}-{r})! = {answer}

---

#### Scenario P2 [permutation]

> A club has {n} members. They need to fill {r} distinct officer roles (e.g. President, Vice-President, Secretary). How many different ways can these roles be assigned?

- **Hint:** The roles are distinct (President ≠ Vice-President), so order matters. Use P({n}, {r}).
- **Solution:** Each role is distinct (order matters), so use permutations. P({n}, {r}) = {n}! / ({n}-{r})! = {answer}

---

#### Scenario P3 [permutation]

> How many different {r}-letter arrangements can be made from {n} distinct letters (no repetition)?

- **Hint:** Different orderings of the same letters count separately, so use P({n}, {r}).
- **Solution:** Each arrangement is a different sequence (order matters), so use permutations. P({n}, {r}) = {n}! / ({n}-{r})! = {answer}

---

#### Scenario P4 [permutation]

> A museum has {n} paintings to display. They have wall space for {r} paintings in a row. How many different arrangements are possible?

- **Hint:** The arrangement (order) of paintings matters, so use P({n}, {r}).
- **Solution:** The order of paintings on the wall matters, so use permutations. P({n}, {r}) = {n}! / ({n}-{r})! = {answer}

---

#### Scenario P5 [permutation]

> A password is created by choosing {r} different digits from the digits 0 to {n-1} (no repetition). How many different passwords are possible?

- **Hint:** Different orderings of the same digits give different passwords, so use P({n}, {r}).
- **Solution:** Different orderings give different passwords (order matters), so use permutations. P({n}, {r}) = {n}! / ({n}-{r})! = {answer}

---

## Category: Quadratic Equations

- **id:** `quadratic-equation`
- **label:** Quadratic Equations
- **sublabel:** Find both roots
- **type:** `quadratic-equation`
- **icon:** `Sigma`
- **description:** Factor or use the quadratic formula to find both integer roots of ax² + bx + c = 0.
- **difficulty:** `medium`

### Difficulty Levels

#### Easy
Monic (a=1), small roots close to zero, obvious factoring pattern.

```
coeff_a: 1
roots_min: -4
roots_max: 4
forms:
  - factored-monic      # x² + bx + c = 0
  - difference-squares  # x² - k² = 0  (k small)
```

**Example (easy):**
> x² − 3x + 2 = 0
> Answer: x = 1 and x = 2

#### Medium ← calibration anchor
Mix of monic and scaled, moderate root range, all four forms in play.

```
coeff_a_min: 1
coeff_a_max: 4
roots_min: -8
roots_max: 8
forms:
  - factored-monic      # x² + bx + c = 0
  - factored-scaled     # ax² + bx + c = 0  (a > 1)
  - perfect-square      # (x + a)² = b²
  - difference-squares  # x² - k² = 0
```

**Example (medium):**
> 2x² − 2x − 12 = 0
> Answer: x = −2 and x = 3

#### Hard
Larger leading coefficients, wider root range, less obvious factoring.

```
coeff_a_min: 2
coeff_a_max: 6
roots_min: -12
roots_max: 12
forms:
  - factored-scaled     # ax² + bx + c = 0  (a > 1, larger roots)
  - perfect-square      # (x + a)² = b²  (larger values)
```

**Example (hard):**
> 3x² − 3x − 36 = 0
> Answer: x = −3 and x = 4

### Formula Reference (shown in the reference card)

- **Quadratic formula:** x = (-b ± √(b² - 4ac)) / 2a
- **Factored form:** a(x − r₁)(x − r₂) = 0  →  x = r₁ or x = r₂
- **Sum of roots:** r₁ + r₂ = −b/a
- **Product of roots:** r₁ × r₂ = c/a

### Quick Tips (shown in the reference card)

1. Try factoring first — look for two numbers that multiply to c and add to b.
2. If factoring is hard, apply the quadratic formula.
3. Always check both roots by substituting back into the equation.

---

## Adding a new category

To add a new category, copy one of the blocks above and fill in the fields.
Then tell Manus: **"Regenerate the website from CATEGORIES.md"**.

When adding difficulty levels, provide at least one **Example** under `#### Medium` so Manus
knows the exact complexity you consider "standard" for that category.
