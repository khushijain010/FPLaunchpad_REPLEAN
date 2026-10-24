-- Test fixture (not a sample): `induction … with | alt =>` with three alternatives, an
-- `example` proved on its own line, and `rw … at h`, which leaves the goal unchanged.

inductive E where
  | num : Nat → E
  | add : E → E → E
  | mul : E → E → E

def ev : E → Nat
  | .num n => n
  | .add a b => ev a + ev b
  | .mul a b => ev a * ev b

def fold : E → E
  | .num n => .num n
  | .add a b => .add (fold a) (fold b)
  | .mul a b => .mul (fold a) (fold b)

theorem fold_ok (e : E) : ev (fold e) = ev e := by
  induction e with
  | num n => rfl
  | add a b iha ihb =>
    simp only [fold, ev]
    rw [iha, ihb]
  | mul a b iha ihb =>
    simp only [fold, ev]
    rw [iha, ihb]

example (p : Prop) (hp : p) : p := by exact hp

theorem t2 (a b : Nat) (h : a + 0 = b) : a = b := by
  rw [Nat.add_zero] at h
  exact h

example : 2 + 2 = 4 := by decide
