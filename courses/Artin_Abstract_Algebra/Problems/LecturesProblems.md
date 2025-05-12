# Chapter 1: Lec 1 

1.  Define the set $M_n(\mathbb{R})$ and explain the standard notation $a_{ij}$ for its elements.
2.  Define matrix addition for two matrices $A, B \in M_n(\mathbb{R})$. Is this operation commutative? Why or why not?
3.  Define scalar multiplication for a scalar $c \in \mathbb{R}$ and a matrix $A \in M_n(\mathbb{R})$.
4.  Explain why $M_n(\mathbb{R})$ forms a real vector space. What is its dimension?
5.  Provide the formula for the $(i,j)$-th entry of the product $C = AB$ where $A, B \in M_n(\mathbb{R})$.
6.  Consider the matrices $A = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}$ and $B = \begin{pmatrix} 0 & 0 \\ 1 & 0 \end{pmatrix}$. Compute both $AB$ and $BA$. What does this demonstrate about matrix multiplication?
7.  Explain the relationship between matrix multiplication and the composition of linear transformations from $\mathbb{R}^n$ to $\mathbb{R}^n$.
8.  Define the identity matrix $I_n$. What is its role in matrix multiplication? Prove that $AI_n = A$ for any $A \in M_n(\mathbb{R})$.
9.  Define the zero matrix $0_n$. What is its role in matrix addition?
10. State the associative law for matrix multiplication. Why is this property considered more easily understood when thinking about composition of linear transformations?
11. State the distributive law for matrix multiplication over matrix addition ($A(B+C) = AB + AC$).
12. Define what it means for an $n \times n$ matrix $A$ to be invertible. What is the notation for the inverse?
13. Explain why the zero matrix $0_n$ is not invertible.
14. What is the condition for a $1 \times 1$ matrix $[a]$ (where $a \in \mathbb{R}$) to be invertible? What is its inverse if it exists?
15. State the condition for a $2 \times 2$ matrix $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$ to be invertible in terms of its entries.
16. If the $2 \times 2$ matrix $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$ is invertible, write down the formula for its inverse $A^{-1}$.
17. Calculate the inverse of the matrix $A = \begin{pmatrix} 3 & 1 \\ 5 & 2 \end{pmatrix}$. Verify your answer by computing $AA^{-1}$.
18. Define the determinant function $\det: M_n(\mathbb{R}) \to \mathbb{R}$ conceptually (its role, not necessarily the full formula).
19. What is the fundamental relationship between the determinant of a matrix $A$ and its invertibility?
20. Prove that if a matrix $A$ has an inverse, that inverse must be unique.
21. Define the set $GL_n(\mathbb{R})$. What does the "GL" stand for?
22. Explain why $GL_n(\mathbb{R})$ is closed under matrix multiplication. Provide two different arguments as discussed in the lecture (one using inverses, one using determinants).
23. Provide a counterexample to show that $GL_n(\mathbb{R})$ is *not* closed under matrix addition for $n=1$.
24. Find two matrices $A, B \in GL_2(\mathbb{R})$ such that $A+B$ is *not* in $GL_2(\mathbb{R})$.
25. If $A, B \in GL_n(\mathbb{R})$, derive the formula for $(AB)^{-1}$ in terms of $A^{-1}$ and $B^{-1}$.
26. Define a group abstractly, listing the four required properties (including closure, often implied by the definition of the operation).
27. Explain why $GL_n(\mathbb{R})$ forms a group under matrix multiplication.
28. Is $GL_n(\mathbb{R})$ generally an abelian group? Justify your answer. Find two specific matrices in $GL_2(\mathbb{R})$ that do not commute.
29. Define an abelian group. Provide two distinct examples of abelian groups discussed in the lecture.
30. Explain why the set of integers $\mathbb{Z}$ forms a group under addition. Identify the operation, the identity element, and the inverse of an element $a \in \mathbb{Z}$.
31. Explain why any vector space $V$ forms an abelian group under vector addition.
32. Let $T$ be an arbitrary set. Define the set $Sym(T)$ (also denoted $S_T$). What is the group operation for $Sym(T)$?
33. For $G = Sym(T)$, identify the identity element and explain how to find the inverse of an element $g \in G$. Show that the group operation (composition) is associative.
34. Define the symmetric group $S_n$. What set does it consist of permutations of?
35. What is the order (number of elements) of the group $S_n$?
36. Explain why $S_3$ is not an abelian group by providing two permutations in $S_3$ that do not commute. (You can represent permutations using cycle notation or by listing the mappings $1\to ?, 2\to ?, 3\to ?$).
37. How can $GL_n(\mathbb{R})$ be viewed as a group of symmetries of the set $\mathbb{R}^n$? What structure is being preserved by these symmetries?
38. Who was Niels Abel and after whom are abelian groups named?
39. Who was Evariste Galois? What tragic circumstances surrounded his death, and what mathematical fields did he make foundational contributions to, according to the lecture?
40. What was Galois's "big idea" regarding how interesting groups arise from symmetries, as mentioned in the lecture?
41. Who are Mike Artin and Emil Artin, and what are their respective mathematical areas mentioned in the lecture?
42. Why is algebra compared to "learning a new language" in the lecture?
43. Is the property $A(B+C) = AB + AC$ required for a set with multiplication and addition to be a group? Explain.
44. If $A$ is invertible, does $AB=AC$ imply $B=C$? Justify your answer using group properties.
45. Does $BA=CA$ imply $B=C$ if $A$ is invertible? Justify your answer.
46. Show that the determinant of the matrix $A = \begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}$ is zero. Is this matrix in $GL_2(\mathbb{R})$?
47. Consider the set of $n \times n$ matrices with determinant equal to 1. Does this set form a group under matrix multiplication? (This group is called $SL_n(\mathbb{R})$, the special linear group). Justify why or why not based on the group axioms.