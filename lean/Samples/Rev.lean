namespace Rev

def app : List Nat → List Nat → List Nat
  | [],      ys => ys
  | x :: xs, ys => x :: app xs ys

def rev : List Nat → List Nat
  | []      => []
  | x :: xs => app (rev xs) [x]

theorem rev_123 : rev [1, 2, 3] = [3, 2, 1] := by
  rw [rev]
  rw [rev]
  rw [rev]
  rw [rev]
  rw [app]
  rw [app]
  simp only [app]

end Rev
