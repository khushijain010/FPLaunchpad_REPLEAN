namespace ZeroAdd

def myAdd : Nat → Nat → Nat
  | n, 0     => n
  | n, m + 1 => myAdd n m + 1

theorem zero_myAdd (n : Nat) : myAdd 0 n = n := by
  induction n
  case zero => rfl
  case succ k ih =>
    rw [myAdd]
    rw [ih]

end ZeroAdd
