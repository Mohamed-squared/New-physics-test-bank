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

# Chapter 1: Lec 2 Problems

1.  Define the General Linear Group $GL_n(\mathbb{F})$ over a field $\mathbb{F}$ (e.g., $\mathbb{F} = \mathbb{R}, \mathbb{C}, \mathbb{Q}$). What properties must elements of this set satisfy?
2.  Explain step-by-step why $GL_n(\mathbb{R})$ forms a group under matrix multiplication, verifying each of the group axioms (associativity, identity, inverse, closure).
3.  Why is the existence of inverses the key difference between $M_n(\mathbb{R})$ (all $n \times n$ matrices) and $GL_n(\mathbb{R})$ when considering them under matrix multiplication?
4.  Give a rigorous definition of a group $(G, *)$.
5.  Provide an example of a set and an operation that satisfies closure and associativity but lacks an identity element.
6.  Provide an example of a set and an operation that satisfies closure, associativity, and has an identity element, but where not all elements have inverses.
7.  Explain why the proof of associativity for matrix multiplication is often considered easier when viewed as composition of linear transformations.
8.  Define $GL_n(\mathbb{C})$ and $GL_n(\mathbb{Q})$. Are these groups Abelian? Justify your answer.
9.  Let $T$ be any set. Define $Sym(T)$, the group of symmetries (bijections) of $T$. What is the group operation? Prove this operation is associative.
10. What is the identity element in $Sym(T)$? For any $f \in Sym(T)$, describe its inverse $f^{-1}$. Why must $f^{-1}$ exist and also be in $Sym(T)$?
11. Define the Symmetric Group $S_n$. What specific set $T$ corresponds to $S_n$?
12. What is the relationship between $GL_n(\mathbb{R})$ and $Sym(\mathbb{R}^n)$? Is one a subgroup of the other? Explain what structure $GL_n(\mathbb{R})$ preserves that general elements of $Sym(\mathbb{R}^n)$ might not.
13. Define what it means for a subset $H$ of a group $G$ to be a subgroup. List the conditions $H$ must satisfy.
14. Prove that if $H$ is a non-empty subset of a group $G$, then $H$ is a subgroup if and only if for all $a, b \in H$, the element $ab^{-1}$ is also in $H$.
15. Every group $G$ has two "trivial" subgroups. What are they?
16. Describe the group $S_1$. How many elements does it have? Is it Abelian?
17. Describe the group $S_2$. List its elements and construct its multiplication (Cayley) table. Is it Abelian? What is the order of the non-identity element?
18. List all six elements of the group $S_3$ using cycle notation (or describe the permutations explicitly).
19. Define a transposition in $S_n$. List all transpositions in $S_3$.
20. Let $\tau = (1 2)$ and $\sigma = (1 2 3)$ be elements in $S_3$. Compute the product $\tau\sigma$ (apply $\sigma$ first, then $\tau$). Compute the product $\sigma\tau$. Are they equal? What does this tell you about $S_3$?
21. Verify explicitly that $\sigma = (1 2 3)$ has order 3 in $S_3$ (i.e., $\sigma^3 = e$ but $\sigma^1 \neq e$ and $\sigma^2 \neq e$).
22. Verify explicitly that $\tau = (1 2)$ has order 2 in $S_3$.
23. Define the "order of an element" $g$ in a group $G$.
24. What does it mean for an element $g$ in a group $G$ to have infinite order? Give an example of a group and an element within it that has infinite order.
25. Define the cyclic subgroup generated by an element $g \in G$, denoted $\langle g \rangle$. Why must this set always form a subgroup of $G$?
26. Prove that any cyclic subgroup $\langle g \rangle$ is always Abelian, even if the larger group $G$ is not.
27. Find the cyclic subgroup generated by $\tau = (1 2)$ in $S_3$. What is its order (number of elements)?
28. Find the cyclic subgroup generated by $\sigma = (1 2 3)$ in $S_3$. What is its order?
29. Find the cyclic subgroup generated by the integer $3$ in the group $(\mathbb{Z}, +)$. Describe the set. Does the element $3$ have finite or infinite order in this group?
30. Prove the theorem stated in the lecture: Every subgroup of $(\mathbb{Z}, +)$ is of the form $b\mathbb{Z} = \{bk \mid k \in \mathbb{Z}\}$ for some integer $b \ge 0$. (Hint: If $H \neq \{0\}$, let $b$ be the smallest positive integer in $H$ and use the division algorithm).
31. Using the theorem about subgroups of $\mathbb{Z}$, describe the subgroup generated by the integers $6$ and $9$ under addition (i.e., the smallest subgroup containing both $6$ and $9$). What is the corresponding value of $b$?
32. Define what an automorphism of a set is, as discussed in the lecture.
33. Explain how $S_k$ can be considered a subgroup of $S_n$ for $k < n$. Explicitly describe how a permutation in $S_k$ acts as a permutation in $S_n$.
34. Prove using the previous problem (or the $S_3$ calculation) that $S_n$ is non-abelian for all $n \ge 3$.
35. Consider $GL_2(\mathbb{R})$. Let $H$ be the subset of matrices of the form $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}$ where $ad \neq 0$. Prove that $H$ is a subgroup of $GL_2(\mathbb{R})$. (Verify closure, identity, inverses). What geometric property do the corresponding linear transformations have?
36. Let $H$ be the subgroup of upper triangular matrices in $GL_2(\mathbb{R})$ as defined in the previous question. Is $H$ an Abelian group? Prove or disprove by finding a counterexample if necessary.
37. Let $G$ be a group and let $g \in G$. If $g$ has finite order $m$, prove that the cyclic subgroup $\langle g \rangle$ has exactly $m$ distinct elements: $\{e, g, g^2, ..., g^{m-1}\}$.
38. Compare and contrast the concepts of the "order of a group" and the "order of an element".
39. Give an example of an infinite group where every non-identity element has finite order. (Hint: Consider functions or perhaps vectors over a finite field).
40. Let $G=GL_2(\mathbb{R})$. Find the order of the element $A = \begin{pmatrix} 0 & -1 \\ 1 & 0 \end{pmatrix}$. What is the cyclic subgroup generated by $A$?
41. Let $G=GL_2(\mathbb{R})$. Does the element $B = \begin{pmatrix} 2 & 0 \\ 0 & 1 \end{pmatrix}$ have finite or infinite order? Explain.
42. The lecture mentioned a connection between theoretical physics and group theory, particularly regarding symmetries (like radial symmetry). Briefly explain how the concept of a group acting on a set might be useful in physics.
43. Is the set of all non-invertible $n \times n$ matrices a subgroup of $(M_n(\mathbb{R}), +)$ (matrix addition)? Why or why not?
44. Let $H_1$ and $H_2$ be subgroups of a group $G$. Prove that their intersection $H_1 \cap H_2$ is also a subgroup of $G$.
45. Is the union $H_1 \cup H_2$ of two subgroups necessarily a subgroup? Provide a proof or a counterexample (e.g., using subgroups of $\mathbb{Z}$ or $S_3$).
46. Define the "center" of a group $G$, denoted $Z(G)$, as the set of elements that commute with all elements in $G$: $Z(G) = \{ z \in G \mid zg = gz \text{ for all } g \in G \}$. Prove that $Z(G)$ is always a subgroup of $G$.
47. What is the center $Z(\mathbb{Z})$ of the additive group of integers?
48. What is the center $Z(S_3)$ of the symmetric group $S_3$? (You may need to test elements).