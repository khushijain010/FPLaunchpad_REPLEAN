-- Test fixture (not a sample): `cases … with |` alternatives. While the `inl` branch runs,
-- the `inr` goal is waiting and must stay visible, attached to the goal `cases` split.

theorem or_swap (p q : Prop) (h : p ∨ q) : q ∨ p := by
  cases h with
  | inl hp =>
    apply Or.inr
    exact hp
  | inr hq =>
    exact Or.inl hq
