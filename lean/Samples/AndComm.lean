namespace AndComm

theorem and_comm (p q : Prop) : p ∧ q → q ∧ p := by
  intro h
  constructor
  · exact h.2
  · exact h.1

end AndComm
