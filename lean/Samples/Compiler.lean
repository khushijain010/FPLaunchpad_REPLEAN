namespace Compiler

inductive Expr where
  | num : Nat → Expr
  | add : Expr → Expr → Expr

def eval : Expr → Nat
  | .num n   => n
  | .add a b => eval a + eval b

inductive Instr where
  | push : Nat → Instr
  | add  : Instr

def exec : List Instr → List Nat → List Nat
  | [],            stk           => stk
  | .push n :: rest, stk         => exec rest (n :: stk)
  | .add :: rest,  y :: x :: stk => exec rest ((x + y) :: stk)
  | .add :: _,     stk           => stk

def compile : Expr → List Instr
  | .num n   => [.push n]
  | .add a b => compile a ++ compile b ++ [.add]

theorem exec_compile (e : Expr) (rest : List Instr) (stk : List Nat) :
    exec (compile e ++ rest) stk = exec rest (eval e :: stk) := by
  induction e generalizing rest stk
  case num n => rfl
  case add a b iha ihb =>
    simp only [compile, List.append_assoc]
    rw [iha]
    rw [ihb]
    rfl

theorem compile_correct (e : Expr) : exec (compile e) [] = [eval e] := by
  have h := exec_compile e [] []
  rw [List.append_nil] at h
  exact h

end Compiler
