-- Test fixture (not a sample): one line acting on several goals. Each new goal must hang
-- under the goal it came from, and no goal is "proved" by a line that only transformed it.

theorem all_goals_intro (p q : Prop) : (p → p) ∧ (q → q) := by
  constructor
  all_goals intro h
  · exact h
  · exact h

theorem seq_intro (p q : Prop) (hp : p) (hq : q) : (True → p) ∧ (True → q) := by
  constructor <;> intro _
  · exact hp
  · exact hq
