namespace OrComm

theorem or_comm (p q : Prop) : p ∨ q → q ∨ p := by
  intro h
  rcases h with hp | hq
  · apply Or.inr
    exact hp
  · apply Or.inl
    exact hq

end OrComm
