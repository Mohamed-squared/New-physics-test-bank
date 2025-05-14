# Chapter 1 

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

# Chapter 2

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
49. Define what it means for two groups $(G_1, *_1)$ and $(G_2, *_2)$ to be isomorphic. List all the conditions a map $f: G_1 \to G_2$ must satisfy.
50. Explain the intuitive meaning of "two groups having the same multiplication table up to a relabeling of elements" in the context of isomorphism.
51. Consider the group $G_1 = \{\pm 1, \pm i\}$ under complex multiplication. Let $\rho$ be the permutation in $S_4$ defined by $\rho(1)=2, \rho(2)=3, \rho(3)=4, \rho(4)=1$. Let $G_2 = \langle \rho \rangle$. Construct an explicit isomorphism $f: G_1 \to G_2$.
52. Verify that your map $f$ from the previous problem preserves the group operation for at least one pair of non-identity elements. For example, show $f(i \cdot (-1)) = f(i) \circ f(-1)$.
53. State the general fact discussed in the lecture about the isomorphism of cyclic groups.
54. If $G_1 = \langle x_1 \rangle$ and $G_2 = \langle x_2 \rangle$ are two cyclic groups of the same finite order $n$, describe the standard map $\phi: G_1 \to G_2$ that establishes their isomorphism. What is crucial about $x_1$ and $x_2$ for this map to be well-defined and an isomorphism?
55. Prove that the map $\phi(x_1^k) = x_2^k$ (where $x_1, x_2$ are generators of cyclic groups $G_1, G_2$ of the same order $n$) preserves the group operation.
56. Consider the group of real numbers under addition, $(\mathbb{R}, +)$, and the group of positive real numbers under multiplication, $(\mathbb{R}_{>0}, \times)$. Provide an explicit isomorphism between these two groups and verify the homomorphism property.
57. What property of the exponential and logarithmic functions makes the isomorphism between $(\mathbb{R}, +)$ and $(\mathbb{R}_{>0}, \times)$ bijective?
58. Describe the Klein four-group ($V_4$) as a subgroup of $S_4$. List its four elements using cycle notation.
59. For the elements $\tau_1 = (1 2)(3 4)$ and $\tau_2 = (1 3)(2 4)$ in your $S_4$ representation of the Klein four-group, calculate $\tau_1^2$, $\tau_2^2$, and $\tau_1\tau_2$. Does $\tau_1\tau_2 = \tau_2\tau_1$?
60. Describe a representation of the Klein four-group using $2 \times 2$ diagonal matrices with entries $\pm 1$. List the four matrices.
61. Construct an explicit isomorphism between the $S_4$ representation and the matrix representation of the Klein four-group.
62. Explain why the Klein four-group ($V_4$) is not isomorphic to the cyclic group of order 4 ($C_4$). Base your argument on the orders of elements.
63. List three distinct properties that isomorphic groups must share, which can be used to quickly check if two groups might *not* be isomorphic.
64. If $G_1$ is an abelian group and $G_2$ is a non-abelian group, can they be isomorphic? Explain why or why not.
65. If an isomorphism $f: G \to H$ exists, prove that $f(e_G) = e_H$, where $e_G$ and $e_H$ are the identity elements of $G$ and $H$ respectively.
66. If an isomorphism $f: G \to H$ exists, prove that $f(x^{-1}) = (f(x))^{-1}$ for all $x \in G$.
67. Define an automorphism of a group $G$.
68. Let $\text{Aut}(G)$ be the set of all automorphisms of a group $G$. What is the group operation for $\text{Aut}(G)$?
69. Prove that the composition of two automorphisms of $G$ is also an automorphism of $G$ (i.e., verify closure for $\text{Aut}(G)$).
70. What is the identity element in the group $\text{Aut}(G)$? Verify it acts as an identity.
71. The lecture mentioned that the inverse of an automorphism is an automorphism. Assuming $f:G \to G$ is an isomorphism, briefly outline why $f^{-1}$ (which is bijective) must also preserve the group operation. (i.e., show $f^{-1}(ab) = f^{-1}(a)f^{-1}(b)$ for $a,b \in G$, by letting $x=f^{-1}(a), y=f^{-1}(b)$).
72. How can $\text{Aut}(G)$ be described in terms of "symmetries" of the group $G$?
73. Define a homomorphism between two groups $(G_1, *_1)$ and $(G_2, *_2)$. How does it differ from an isomorphism?
74. Provide an example of a homomorphism that is not an isomorphism. Explain why it fails to be an isomorphism. (The determinant map is a good candidate).
75. Explain why the determinant map $\det: GL_n(\mathbb{R}) \to (\mathbb{R}^*, \times)$ is a homomorphism. Why is it not an isomorphism for $n \ge 2$?
76. Given any two groups $G_1$ and $G_2$, describe the "trivial homomorphism" between them. Verify that it indeed satisfies the homomorphism property.
77. Is every isomorphism also a homomorphism? Explain.
78. Define the image of a homomorphism $f: G_1 \to G_2$, denoted $\text{Im}(f)$.
79. Consider the homomorphism $f: \mathbb{Z} \to \mathbb{Z}_4$ (integers mod 4) given by $f(x) = x \pmod 4$. What is the image of this homomorphism?
80. The lecture stated that $\text{Im}(f)$ is a subgroup of $G_2$. While the proof was deferred, explain intuitively why this might be true (e.g., is the identity of $G_2$ in $\text{Im}(f)$? If $a,b \in \text{Im}(f)$, is $ab \in \text{Im}(f)$?).
81. In the example $G_1 = \{\pm 1, \pm i\}$ and $G_2 = \langle \rho=(1234) \rangle \subset S_4$, what is the order of $i \in G_1$? What is the order of its image $\rho \in G_2$ under the isomorphism $f(i^k) = \rho^k$?
82. Does an isomorphism preserve the order of elements? Briefly justify your answer.
83. Can a finite group be isomorphic to an infinite group? Why or why not?
84. Consider the group $(\mathbb{Z}, +)$. Is the map $f: \mathbb{Z} \to \mathbb{Z}$ defined by $f(x) = 2x$ a homomorphism? Is it an isomorphism? What is its image?
85. Consider the group $(\mathbb{R}_{>0}, \times)$. Is the map $g: \mathbb{R}_{>0} \to \mathbb{R}_{>0}$ defined by $g(x) = x^2$ a homomorphism? Is it an isomorphism? What is its image?
86. If $G$ is a cyclic group generated by $x$, and $f: G \to H$ is a homomorphism, show that $\text{Im}(f)$ is a cyclic group generated by $f(x)$.
87. What are the orders of the non-identity elements in the Klein four-group $V_4$? How does this compare to the orders of non-identity elements in $C_4$ (the cyclic group of order 4)?
88. If a group $G$ has exactly one element of order 2, prove that this element must be in the center of $G$, $Z(G) = \{z \in G \mid zg=gz \text{ for all } g \in G\}$. (Hint: consider $gxg^{-1}$ for any $g \in G$).
89. Let $f: G \to H$ be a homomorphism. Prove that $f(e_G) = e_H$. (Hint: consider $f(e_G \cdot e_G)$).
90. Let $f: G \to H$ be a homomorphism. Prove that $f(x^{-1}) = (f(x))^{-1}$ for all $x \in G$. (Hint: use the result from the previous problem and $f(x \cdot x^{-1})$).
91. The lecture reviewed that subgroups of $(\mathbb{Z}, +)$ are of the form $b\mathbb{Z}$. What is the significance of the Euclidean algorithm or division algorithm in proving this fact?
92. Consider the cyclic subgroup generated by $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$ in $GL_2(\mathbb{R})$. Is this group isomorphic to $(\mathbb{Z}, +)$? If so, define the isomorphism.
93. Can the group $S_3$ be isomorphic to any subgroup of $(\mathbb{R}, +)$? Explain your reasoning.
94. Let $G$ be any group. Is the map $f: G \to G$ defined by $f(x) = x^{-1}$ always a homomorphism? If not, under what conditions on $G$ would it be a homomorphism?
95. The lecture mentioned that Artin might use 'V' for the Klein four-group. Does the specific symbol used for a group change its abstract group structure or its potential isomorphisms to other groups? Explain.
96. The lecture states that for a group, "once you have associativity for three elements, you have it for more than three elements." Briefly explain the significance of proving associativity for $(a*b)*c = a*(b*c)$ in defining a group and how it allows for unambiguous products of multiple elements.
97. If $(G, *)$ is a group, prove that the identity element $e$ is unique. (Hint: Assume there are two identity elements $e_1, e_2$ and show $e_1=e_2$).
98. If $(G, *)$ is a group, prove that for any element $a \in G$, its inverse $a^{-1}$ is unique. (Hint: Assume $b$ and $c$ are both inverses of $a$).
99. In a group $G$, if $a,b \in G$, prove that $(ab)^{-1} = b^{-1}a^{-1}$. How does this relate to taking inverses of matrix products?
100. In a group $G$, prove the cancellation laws by explicitly using group axioms:
    a.  If $ax = ay$, then $x=y$ (left cancellation).
    b.  If $xa = ya$, then $x=y$ (right cancellation).
101. What did the lecturer refer to as the "Ur group" or "prototypical example of a group," and why is this particular construction (symmetries of a set) considered so fundamental in group theory?
102. Explain the difference in meaning between "morphism" and "automorphism" in a general mathematical context, as touched upon in the lecture when discussing $Sym(T)$.
103. The lecture mentions that learning algebra is like "learning a new language" and discusses jargon differences between mathematicians and physicists. Why is understanding the precise definitions of terms (like "group", "subgroup", "order") crucial in abstract algebra, especially when compared to more calculation-focused areas of mathematics?
104. Explain why the condition $\det(A) \neq 0$ is essential for a matrix $A$ to be an element of $GL_n(\mathbb{R})$. How does this relate to the existence of an inverse matrix $A^{-1}$ such that $AA^{-1} = A^{-1}A = I$?
105. Why is $GL_1(\mathbb{R})$ (invertible $1 \times 1$ real matrices) an Abelian group? What well-known group of numbers under multiplication is it isomorphic to?
106. Provide a specific example of two matrices $A, B \in GL_2(\mathbb{C})$ (complex entries) such that $AB \neq BA$.
107. Consider the set of $n \times n$ real matrices with determinant 1, denoted $SL_n(\mathbb{R})$ (the special linear group). Explain why $SL_n(\mathbb{R})$ forms a subgroup of $GL_n(\mathbb{R})$ by verifying closure under multiplication, existence of identity, and closure under inverses.
108. Does the set of all $n \times n$ matrices with determinant $-1$ form a subgroup of $GL_n(\mathbb{R})$? Explain why or why not by checking the subgroup axioms.
109. What is the order of the symmetric group $S_4$? Based on the lecture's findings for $S_3$, would you expect $S_4$ to be Abelian or non-Abelian? Justify your reasoning without explicitly listing all elements of $S_4$.
110. In $S_3$, we identified elements $\tau=(1 2)$ and $\sigma=(1 2 3)$. The lecture calculated $\tau\sigma=(23)$ and $\sigma\tau=(13)$. What is $(\tau\sigma)^{-1}$ in $S_3$? What is $(\sigma\tau)^{-1}$ in $S_3$? Express them as elements of $S_3$.
111. Express the permutation $\sigma' = (132)$ in $S_3$ as a product of transpositions. Can you find a different product of transpositions that also equals $\sigma'$?
112. What is the inverse of the permutation $\pi = (1 2 3)$ in $S_3$? What is the inverse of $\tau = (12)$ in $S_3$? Explain your reasoning based on the definition of an inverse element in a group (i.e., what element composed with it gives the identity).
113. The lecture used the notation $A \cdot B(t) = A(B(t))$ for composition in $Sym(T)$. If $A$ is "apply the map $A$" and $B$ is "apply the map $B$", does the product $A \cdot B$ mean "apply $A$ first, then $B$" or "apply $B$ first, then $A$"? Clarify based on the lecture's example calculation of $\tau\sigma$ in $S_3$.
114. For $S_n$, an element is a permutation, which is a bijective function from $\{1, ..., n\}$ to itself. Explain conceptually why if $\pi \in S_n$ is a bijection, its inverse function $\pi^{-1}$ must also be a bijection from $\{1, ..., n\}$ to itself.
115. If $H$ is a subgroup of $G$, and $K$ is a subgroup of $H$, prove that $K$ is also a subgroup of $G$.
116. The lecture states $S_3$ is a subgroup of $S_n$ for $n \ge 3$ by "fixing the letters $4, 5, ..., n$." Explain precisely what this means for a permutation. How would the permutation $\tau=(12) \in S_3$ be written as an element of $S_4$ under this convention? How would $\sigma=(123) \in S_3$ be written as an element of $S_4$?
117. Consider the subgroup $H$ of $GL_2(\mathbb{R})$ consisting of matrices of the form $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}$ where $ad \neq 0$. Find the explicit formula for the inverse of a generic element $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}$ in $H$ and show that this inverse is also in $H$.
118. In the proof that any subgroup $H$ of $(\mathbb{Z},+)$ is of the form $b\mathbb{Z}$, why is it crucial to choose $b$ as the *smallest positive* integer in $H$ (if $H \neq \{0\}$)? What could go wrong if we chose $b$ to be, for example, any non-zero element in $H$, or the smallest (possibly negative) non-zero element?
119. Consider the subgroup $2\mathbb{Z}$ (even integers) and $3\mathbb{Z}$ (multiples of 3) of $(\mathbb{Z},+)$. Describe their intersection $H = 2\mathbb{Z} \cap 3\mathbb{Z}$. According to the theorem on subgroups of $\mathbb{Z}$, $H$ must be of the form $b\mathbb{Z}$. What is $b$ in this case?
120. Is the union $H = 2\mathbb{Z} \cup 3\mathbb{Z}$ a subgroup of $(\mathbb{Z},+)$? Justify your answer by attempting to verify the subgroup criteria (e.g., closure under addition).
121. Let $G$ be an Abelian group. If $H$ is a subgroup of $G$, is $H$ necessarily Abelian? Explain your reasoning.
122. Let $G$ be any group. Is the trivial subgroup $\{e\}$ (containing only the identity) always Abelian? Is $G$ itself (when viewed as a subgroup of $G$) always Abelian? Explain.
123. If an element $g$ in a group $G$ has order $m$ (a positive integer), what is the order of $g^{-1}$? Prove your assertion.
124. If an element $g$ in a group $G$ has finite order $m$, what can you say about the element $g^k$ if $k$ is a multiple of $m$?
125. If an element $g \in G$ has infinite order, can any power $g^k$ (for $k \neq 0, k \in \mathbb{Z}$) have finite order? Explain your reasoning.
126. Consider the element $1$ in the group $(\mathbb{Z}, +)$. What is the cyclic subgroup $\langle 1 \rangle$? What is the order of the element $1$ in this group?
127. Consider the element $0$ in the group $(\mathbb{Z}, +)$. What is the cyclic subgroup $\langle 0 \rangle$? What is the order of the element $0$ in this group?
128. In $S_3$, the element $\tau=(12)$ has order 2. List the elements of $\langle \tau \rangle$. The element $\sigma=(123)$ has order 3. List the elements of $\langle \sigma \rangle$. What is $\langle e \rangle$, where $e$ is the identity in $S_3$?
129. If a group $G$ is finite, must every element in $G$ have finite order? Explain why, by considering the sequence of powers $g, g^2, g^3, ...$ and the finiteness of $G$.
130. The lecture asked if an infinite group can have all its non-identity elements be of finite order. Can you think of such an example, or argue why it might be difficult to construct? (Consider, for example, direct sums of many finite cyclic groups).
131. Let $g$ be an element of order $m$ in a group $G$. Prove that $g^k = e$ if and only if $m$ divides $k$. (You'll need to use the division algorithm for integers for one direction).
132. Consider the matrix $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$ in $GL_2(\mathbb{R})$. Compute $A^2, A^3, A^n$ for a general positive integer $n$. What is the cyclic subgroup $\langle A \rangle$? Does $A$ have finite or infinite order in $GL_2(\mathbb{R})$?
133. "In a finite group, every element has finite order and the order divides the order of the group." (Lagrange's Theorem, mentioned in the lecture). If a group $G$ has order 5 (which is a prime number), what can you say about the order of any non-identity element $g \in G$? What does this imply about the structure of $G$ (specifically, must it be a cyclic group)?
134. Niels Abel and Evariste Galois are two mathematicians whose names are prominently featured in group theory. Briefly state their key contributions mentioned in the lecture and the tragic circumstances of their early deaths.
135. The lecture contrasts how group theory courses often start (e.g., with $S_n$) versus Professor Artin's textbook approach (starting with matrix groups like $GL_n(\mathbb{R})$). What justification was given in the lecture for why matrix groups might be considered "more fundamental" in a broader mathematical context?
136. Explain the analogy of a subgroup "stabilizing" a certain structure or subset, using the example of matrices in $GL_2(\mathbb{R})$ that stabilize the x-axis (the line $y=0$). How does this concept relate to the broader idea that many important groups arise from sets of symmetries preserving some structure?
137. What is the "Euclidean algorithm" (or division algorithm for integers) and how was it instrumental in the proof that all subgroups of $(\mathbb{Z}, +)$ are of the form $b\mathbb{Z}$? Outline the key step where it is used.
138. If $G$ is a group, and $g \in G$, the power laws like $(g^m)(g^n) = g^{m+n}$ and $(g^m)^n = g^{mn}$ hold for integers $m,n$. Briefly explain why these are direct consequences of the group axioms, primarily associativity and the definition of powers.
139. If a set $T$ has only one element, say $T=\{x\}$, describe $Sym(T)$ explicitly. What is its order? To which simple group is it isomorphic?
140. If a set $T$ has two elements, say $T=\{x,y\}$, describe $Sym(T)$ explicitly. What group studied in the lecture is it isomorphic to ($S_1, S_2,$ etc.)?
141. The lecture mentions that "one of the things that mathematicians found out when they started talking to theoretical physicists ... is that we were doing exactly the same thing but had different words for it." Why is this realization important in interdisciplinary scientific research, and how does establishing common vocabulary (or at least a clear translation between jargons) help foster collaboration and understanding?
142. What are the key properties (axioms) that distinguish $GL_n(\mathbb{R})$ (as a group under multiplication) from the set of all $n \times n$ matrices $M_n(\mathbb{R})$ (which forms a vector space under addition and scalar multiplication, but not generally a group under matrix multiplication)?
143. Why is the concept of a "bijection" (a one-to-one and onto map) so central to the definition of $Sym(T)$ and $S_n$? What would happen to the group structure (specifically, the existence of inverses for all elements) if we allowed non-bijections (e.g., just any function from $T$ to $T$) when trying to form a group under composition?
144. Define a group homomorphism $\phi: G \to H$ between two groups $(G, \cdot_G)$ and $(H, \cdot_H)$.
145. Let $\phi: G \to H$ be a group homomorphism. Prove that $\phi(e_G) = e_H$, where $e_G$ and $e_H$ are the identity elements of $G$ and $H$ respectively.
146. Let $\phi: G \to H$ be a group homomorphism. Prove that for any $g \in G$, $\phi(g^{-1}) = (\phi(g))^{-1}$.
147. Let $\phi: G \to H$ be a group homomorphism. Prove that for any $g \in G$ and any integer $k$, $\phi(g^k) = (\phi(g))^k$.
148. Consider the group $(\mathbb{Z}, +)$ and the group $(\mathbb{Z}_n, +)$ (integers modulo $n$ under addition). Define a map $\phi: \mathbb{Z} \to \mathbb{Z}_n$ by $\phi(x) = x \pmod n$. Prove that $\phi$ is a group homomorphism.
149. Consider the group $(\mathbb{R}, +)$ and the group $(\mathbb{R}^{>0}, \cdot)$ (positive real numbers under multiplication). Show that the exponential map $\phi(x) = e^x$ is a homomorphism. Is it an isomorphism?
150. Define the kernel of a group homomorphism $\phi: G \to H$, denoted $\text{ker}(\phi)$.
151. Prove that $\text{ker}(\phi)$ is always a subgroup of $G$.
152. Prove that $\text{ker}(\phi)$ is always a normal subgroup of $G$.
153. Define the image of a group homomorphism $\phi: G \to H$, denoted $\text{im}(\phi)$ or $\phi(G)$.
154. Prove that $\text{im}(\phi)$ is always a subgroup of $H$. (Is it necessarily normal in $H$?)
155. Let $\phi: G \to H$ be a group homomorphism. Prove that $\phi$ is injective if and only if $\text{ker}(\phi) = \{e_G\}$.
156. Let $\phi: G \to H$ be a group homomorphism. When is $\phi$ surjective? Relate this to its image.
157. Define a group isomorphism. What does it mean for two groups $G$ and $H$ to be isomorphic, denoted $G \cong H$?
158. Explain the significance of two groups being isomorphic. What properties must they share?
159. Prove that if $\phi: G \to H$ is an isomorphism, then its inverse map $\phi^{-1}: H \to G$ is also an isomorphism.
160. Consider the map $\phi: (\mathbb{Z}, +) \to (\mathbb{Z}, +)$ defined by $\phi(n) = 2n$.
    a. Show that $\phi$ is a homomorphism.
    b. Find $\text{ker}(\phi)$.
    c. Find $\text{im}(\phi)$.
    d. Is $\phi$ an isomorphism? Explain.
161. Consider the determinant map $\det: GL_n(\mathbb{R}) \to (\mathbb{R}^\times, \cdot)$, where $\mathbb{R}^\times = \mathbb{R} \setminus \{0\}$ is the group of non-zero real numbers under multiplication.
    a. Prove that $\det$ is a group homomorphism.
    b. What is the kernel of this homomorphism? (This subgroup has a special name).
    c. Is this homomorphism surjective? Explain.
162. Consider the sign homomorphism $\text{sgn}: S_n \to (\{-1, 1\}, \cdot)$, which maps a permutation to $1$ if it's even and $-1$ if it's odd.
    a. Assuming this is a homomorphism, what is its kernel? (This subgroup also has a special name).
    b. What is its image?
    c. For which $n \ge 2$ is this homomorphism surjective?
163. Define a group automorphism. What does $\text{Aut}(G)$ represent? Show that $\text{Aut}(G)$ forms a group under composition of functions.
164. For any $a \in G$, define the map $\phi_a: G \to G$ by $\phi_a(x) = axa^{-1}$. Prove that $\phi_a$ is an automorphism of $G$. (These are called inner automorphisms).
165. Let $G$ be an abelian group. Describe the inner automorphisms of $G$. What can you conclude about $\text{Inn}(G)$ in this case?
166. State the First Isomorphism Theorem for groups. Clearly define all components of the statement.
167. Let $\phi: G \to H$ be a surjective group homomorphism. Use the First Isomorphism Theorem to relate $G/\text{ker}(\phi)$ to $H$.
168. Use the First Isomorphism Theorem and the homomorphism $\phi: \mathbb{Z} \to \mathbb{Z}_n$ given by $\phi(x) = x \pmod n$ to show that $\mathbb{Z}/\langle n \rangle \cong \mathbb{Z}_n$. (Here $\langle n \rangle = n\mathbb{Z}$).
169. Use the First Isomorphism Theorem and the determinant map $\det: GL_n(\mathbb{R}) \to \mathbb{R}^\times$ to describe the quotient group $GL_n(\mathbb{R})/SL_n(\mathbb{R})$.
170. Use the First Isomorphism Theorem and the sign map $\text{sgn}: S_n \to \{-1, 1\}$ (for $n \ge 2$) to describe the quotient group $S_n/A_n$.
171. Suppose $\phi: G \to H$ is a homomorphism and $g \in G$ has finite order $m$. Prove that the order of $\phi(g)$ in $H$ must divide $m$.
172. If $\phi: G \to H$ is an isomorphism and $g \in G$ has order $m$, what is the order of $\phi(g)$? Justify your answer.
173. Can a cyclic group be isomorphic to a non-cyclic group? Explain why or why not.
174. Can an abelian group be isomorphic to a non-abelian group? Explain why or why not.
175. Show that the group $(\mathbb{R}, +)$ is isomorphic to the group $(\mathbb{R}^{>0}, \cdot)$ of positive real numbers under multiplication. (Hint: Consider $\ln(x)$ or $e^x$).
176. Prove that any two cyclic groups of the same finite order $n$ are isomorphic to each other (and thus to $\mathbb{Z}_n$).
177. Prove that any infinite cyclic group is isomorphic to $(\mathbb{Z}, +)$.
178. Let $N$ be a normal subgroup of $G$. Define the canonical projection (or natural homomorphism) $\pi: G \to G/N$. What is the kernel of $\pi$? What is its image?
179. Is the map $\phi: \mathbb{Z}_4 \to \mathbb{Z}_2$ given by $\phi(x) = x \pmod 2$ a well-defined homomorphism? If so, find its kernel and image.
180. Let $G$ be any group. Is the map $\phi: G \to G$ defined by $\phi(g) = g^{-1}$ always a homomorphism? If not, under what condition on $G$ is it a homomorphism?
181. Let $G$ be any group. Is the map $\phi: G \to G$ defined by $\phi(g) = g^2$ always a homomorphism? If not, under what condition on $G$ is it a homomorphism?
182. Find all homomorphisms from $(\mathbb{Z}_3, +)$ to $(\mathbb{Z}_4, +)$. For each, determine its kernel and image. (Hint: Where can the generator of $\mathbb{Z}_3$ be mapped?)
183. Find all homomorphisms from $(\mathbb{Z}, +)$ to $(\mathbb{Z}, +)$. (Hint: A homomorphism is determined by where it sends $1$).
184. Let $H$ be a subgroup of $G$. If $\phi: G \to K$ is a homomorphism, prove that $\phi(H) = \{\phi(h) \mid h \in H\}$ is a subgroup of $K$.
185. Let $K$ be a subgroup of $H$. If $\phi: G \to H$ is a homomorphism, prove that $\phi^{-1}(K) = \{g \in G \mid \phi(g) \in K\}$ is a subgroup of $G$. Further, if $K$ is normal in $H$, is $\phi^{-1}(K)$ necessarily normal in $G$?
186. Consider the group of $2 \times 2$ real matrices $G = \left\{ \begin{pmatrix} a & b \\ 0 & d \end{pmatrix} \mid a,d \in \mathbb{R}^\times, b \in \mathbb{R} \right\}$ under matrix multiplication. Define $\phi: G \to \mathbb{R}^\times \times \mathbb{R}^\times$ by $\phi\left(\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}\right) = (a,d)$. Show that $\phi$ is a homomorphism. Find its kernel and image. Apply the First Isomorphism Theorem.
187. What is the relationship between the center $Z(G)$ of a group $G$ and the group of inner automorphisms $\text{Inn}(G)$? (Hint: Consider the map $g \mapsto \phi_g$ from $G$ to $\text{Aut}(G)$).
188. If $G/Z(G)$ is cyclic, prove that $G$ must be abelian. (This is a classic result).
189. Explain Cayley's Theorem, which states that every group $G$ is isomorphic to a subgroup of $Sym(G)$ (the group of permutations of the set $G$). Describe the homomorphism used to prove this.
190. For a finite group $G$, use Cayley's theorem to argue why $G$ is isomorphic to a subgroup of $S_n$ for $n=|G|$.
191. Does there exist a non-trivial homomorphism from $S_3$ to $\mathbb{Z}_4$? Justify your answer.
192. Suppose $\phi: G \to H$ is a homomorphism. If $N$ is a normal subgroup of $G$, is $\phi(N)$ necessarily a normal subgroup of $\text{im}(\phi)$? Is it necessarily normal in $H$?
193. If $G$ is a simple group (a group whose only normal subgroups are $\{e\}$ and $G$ itself), what can you say about any homomorphism $\phi: G \to H$? (Consider its kernel).
194. Briefly describe Carl Friedrich Gauss's contribution to the concept of modular arithmetic and the notation $\mathbb{Z}/N\mathbb{Z}$ as discussed in the lecture. In what famous work and year did he introduce this?
195. Define the elements of the group $\mathbb{Z}/N\mathbb{Z}$ for an integer $N > 0$. When are two integers $A$ and $B$ considered to represent the same element in $\mathbb{Z}/N\mathbb{Z}$? Use Gauss's congruence notation.
196. Explain how addition is defined in $\mathbb{Z}/N\mathbb{Z}$. If $\bar{A}$ and $\bar{B}$ are elements, what is $\bar{A} + \bar{B}$?
197. Why is $\mathbb{Z}/N\mathbb{Z}$ a cyclic group? What is a common generator for this group? What is the order of $\mathbb{Z}/N\mathbb{Z}$?
198. Describe the natural surjective homomorphism $\phi: \mathbb{Z} \to \mathbb{Z}/N\mathbb{Z}$. What is its kernel?
199. The lecture mentions that $\mathbb{Z}$ is a ring. What two operations define its ring structure? Does $\mathbb{Z}/N\mathbb{Z}$ also form a ring? If so, how is multiplication defined for elements $\bar{A}, \bar{B} \in \mathbb{Z}/N\mathbb{Z}$?
200. Define the "units" of a ring $R$, denoted $R^*$. What is the group operation for $R^*$? What are the units of the ring $\mathbb{Z}$?
201. Let $H$ be a subgroup of $G$. The lecture poses the question: "When can we put a group structure on the set of all cosets $AH$?" What is this set of cosets usually denoted as?
202. Consider the case where $H = \text{ker}(F)$ for some homomorphism $F: G \to G'$. Explain the relationship between the cosets of $H$ and the fibers of the map $F$.
203. If $H = \text{ker}(F)$, how is the group structure on $G/H$ (the set of cosets) "transported" from the image $\text{Im}(F)$? What is the multiplication rule for $(AH)(BH)$ in $G/H$ in this scenario?
204. Define a normal subgroup $H$ of a group $G$. Give two equivalent definitions (one involving conjugation, one involving left and right cosets).
205. Why is the kernel of any group homomorphism $F: G \to G'$ always a normal subgroup of $G$? Prove this.
206. Explain the problem of well-definedness for the coset multiplication rule $(AH)(BH) = (AB)H$ if $H$ is an arbitrary (not necessarily normal) subgroup. Provide the specific condition involving an element $A \in G$ and $h \in H$ that illustrates why the definition might fail if $H$ is not normal.
207. Prove that if $H$ is a normal subgroup of $G$, then the coset multiplication $(AH)(BH) = (AB)H$ is well-defined. (Hint: Show that if $A_1H = A_2H$ and $B_1H = B_2H$, then $(A_1B_1)H = (A_2B_2)H$).
208. An alternative way to show the coset product is well-defined when $H$ is normal is to show that the set product $(AH)(BH) = \{xy \mid x \in AH, y \in BH\}$ is precisely the coset $(AB)H$. Outline the steps of this proof, highlighting where normality ($aH=Ha$) is used.
209. If $H$ is a normal subgroup of $G$, what is the identity element in the quotient group $G/H$? What is the inverse of an element $AH \in G/H$?
210. State the First Isomorphism Theorem for groups. If $F: G \to G'$ is a surjective homomorphism with kernel $H$, what does the theorem conclude? Define the induced isomorphism $\bar{F}$.
211. Explain why the induced map $\bar{F}: G/H \to G'$ in the First Isomorphism Theorem, defined by $\bar{F}(aH) = F(a)$, is well-defined.
212. Briefly outline why $\bar{F}$ from the First Isomorphism Theorem is a homomorphism, is surjective, and is injective.
213. What is the significance of the corollary that states "Every normal subgroup $H$ of $G$ is the kernel of a group homomorphism"? What is this homomorphism?
214. Explain the "factoring" interpretation of the First Isomorphism Theorem. If $F: G \to G'$ is a homomorphism with kernel $H$, and $\Phi: G \to G/H$ is the canonical projection, how does $F$ relate to $\Phi$ and the induced isomorphism $\bar{F}$? (A diagram might be helpful in your explanation).
215. Define a short exact sequence of groups $1 \to H \xrightarrow{g} G \xrightarrow{f} G' \to 1$. What do the '1's represent? What properties must the homomorphisms $g$ and $f$ have, and what is the condition at $G$?
216. In a short exact sequence $1 \to H \xrightarrow{g} G \xrightarrow{f} G' \to 1$, how does $H$ relate to $\text{ker}(f)$? How does $G'$ relate to a quotient of $G$?
217. The lecture emphasized a critical point about short exact sequences: knowing the isomorphism classes of $H$ and $G'$ does *not* uniquely determine the isomorphism class of $G$. Provide the two specific examples of short exact sequences from the lecture that illustrate this point. Identify $H, G, G'$ in each case and explain why the middle groups $G$ are not isomorphic.
218. For the short exact sequence $1 \to A_3 \to S_3 \to \mathbb{Z}/2\mathbb{Z} \to 1$:
    a.  What is the map $S_3 \to \mathbb{Z}/2\mathbb{Z}$?
    b.  What is $A_3$? Why is it normal in $S_3$?
    c.  Verify that $\text{Im}(A_3 \to S_3) = \text{Ker}(S_3 \to \mathbb{Z}/2\mathbb{Z})$.
219. For the short exact sequence $1 \to \mathbb{Z}/3\mathbb{Z} \to \mathbb{Z}/6\mathbb{Z} \to \mathbb{Z}/2\mathbb{Z} \to 1$:
    a.  Describe the map $\mathbb{Z}/6\mathbb{Z} \to \mathbb{Z}/2\mathbb{Z}$.
    b.  What subgroup of $\mathbb{Z}/6\mathbb{Z}$ is isomorphic to $\mathbb{Z}/3\mathbb{Z}$ and serves as the kernel of this map?
220. Explain the meaning of "exactness" at a group $G_k$ in a longer sequence of group homomorphisms $\dots \to G_{k-1} \xrightarrow{f_{k-1}} G_k \xrightarrow{f_k} G_{k+1} \to \dots$.
221. Why is the concept of a quotient group $G/H$ only meaningful (as a group with a naturally inherited operation) when $H$ is a normal subgroup?
222. If $G$ is an abelian group, prove that any subgroup $H$ of $G$ is normal.
223. Consider the group $G = GL_2(\mathbb{R})$ and the subgroup $H = SL_2(\mathbb{R}) = \{A \in GL_2(\mathbb{R}) \mid \det(A)=1\}$.
    a.  Prove that $H$ is a normal subgroup of $G$. (Hint: Consider the determinant homomorphism).
    b.  Describe the quotient group $G/H$. To what familiar group is it isomorphic? (Hint: First Isomorphism Theorem).
224. Let $F: G \to G'$ be a group homomorphism. Prove that $\text{Im}(F)$ is a subgroup of $G'$.
225. Consider the group $\mathbb{Z}/12\mathbb{Z}$.
    a.  List all its elements.
    b.  Find the subgroup $H = \langle \bar{4} \rangle$ generated by $\bar{4}$. List its elements.
    c.  Since $\mathbb{Z}/12\mathbb{Z}$ is abelian, $H$ is normal. List the distinct cosets of $H$ in $\mathbb{Z}/12\mathbb{Z}$.
    d.  Construct the Cayley table (addition table) for the quotient group $(\mathbb{Z}/12\mathbb{Z})/H$.
    e.  To what familiar group is $(\mathbb{Z}/12\mathbb{Z})/H$ isomorphic?
226. Let $G$ be a group. The center of $G$, $Z(G) = \{z \in G \mid zg=gz \text{ for all } g \in G\}$, is a subgroup. Prove that $Z(G)$ is always a normal subgroup of $G$.
227. If $G/Z(G)$ is a cyclic group, prove that $G$ must be abelian. (This is a standard, slightly more advanced problem).
228. The lecture mentions Eilenberg and MacLane as the originators of the term "exact sequence." In what broader mathematical field is the concept of exact sequences extensively used?
229. What does "par transport de structure" (transport of structure) mean in the context of defining the group operation on $G/H$ when $H = \text{ker}(F)$?
230. Let $H$ be a subgroup of $G$. If $H$ has index 2 in $G$ (i.e., there are only two distinct left cosets of $H$ in $G$), prove that $H$ must be a normal subgroup of $G$.
231. Discuss the historical significance of Gauss's "Disquisitiones Arithmeticae" in the development of group theory, even though the general concept of a group was formalized later.
232. Can a non-abelian group $G$ have an abelian quotient group $G/H$ (where $H \neq \{e\}$)? If yes, provide an example. If no, explain why.
233. Can an abelian group $G$ have a non-abelian quotient group $G/H$? Explain your reasoning.
234. Let $N$ be a normal subgroup of $G$, and $K$ be a normal subgroup of $H$. Is it true that $N \cap K$ must be a normal subgroup of $G \cap H$? Justify. (This is a test of understanding definitions).
235. Consider the statement from the lecture: "You have to ask, before you get the group structure and everything... is this well defined?" Why is checking for well-definedness a crucial first step when defining operations on sets of equivalence classes (like cosets)?
236. If $H$ is a normal subgroup of $G$, describe the canonical projection map $\pi: G \to G/H$. Is this map always surjective? Is it always injective? What is its kernel?
237. Suppose $G$ is a simple group (meaning its only normal subgroups are $\{e\}$ and $G$ itself). What can you say about any homomorphism $F: G \to G'$? (Consider its kernel).
238. The lecture states that "the inputs $H$ and $G'$ [in a short exact sequence $1 \to H \to G \to G' \to 1$] do not determine the group $G$." This is known as the "extension problem." Briefly, what makes this problem complex?

# Chapter 3

1.  If $H$ is a normal subgroup of $G$, and $K$ is a subgroup of $G$ such that $H \subseteq K$, what can be said about $H$ in relation to $K$?
    A.  $H$ is not necessarily normal in $K$.
    B.  $H$ is always normal in $K$.
    C.  $H$ is normal in $K$ if and only if $K$ is normal in $G$.
    D.  $H$ is normal in $K$ if and only if $G/H$ is abelian.
    E.  $H$ is normal in $K$ only if $K=H$ or $K=G$.
    ans: B

2.  If $H$ is a normal subgroup of $G$, and $K$ is a subgroup of $G$ such that $H \subseteq K$, then $K/H$ (the set of cosets of $H$ in $K$) is:
    A.  A normal subgroup of $G$.
    B.  A subgroup of $G/H$.
    C.  Isomorphic to $K$.
    D.  Isomorphic to $G/K$.
    E.  The trivial group.
    ans: B

3.  There is a bijection between the subgroups of $G/H$ (where $H$ is a normal subgroup of $G$) and:
    A.  All subgroups of $G$.
    B.  All normal subgroups of $G$.
    C.  The subgroups of $G$ that are contained in $H$.
    D.  The subgroups of $G$ that contain $H$.
    E.  The elements of $H$.
    ans: D

4.  If $S'$ is a subgroup of $G/H$, the corresponding subgroup $K$ in $G$ (where $H \trianglelefteq G$) under the standard bijection is formed by:
    A.  The intersection of all cosets in $S'$.
    B.  The union of all cosets in $S'$.
    C.  The set of representatives of cosets in $S'$.
    D.  The normalizer of $S'$ in $G$.
    E.  The image of $S'$ under a map from $G/H \to G$.
    ans: B

5.  Let $G = \mathbb{Z}$ (integers under addition) and $H = p\mathbb{Z}$ where $p$ is a prime number. The quotient group $\mathbb{Z}/p\mathbb{Z}$ is:
    A.  An infinite cyclic group.
    B.  A cyclic group of order $p$.
    C.  A non-cyclic group of order $p$.
    D.  Not a group as $p\mathbb{Z}$ is not always normal (it is, as $\mathbb{Z}$ is abelian).
    E.  Isomorphic to $\mathbb{Z}$.
    ans: B

6.  A group of prime order $p$ has how many non-trivial subgroups?
    A.  $p-1$
    B.  $p$
    C.  $1$ (only the group itself, which is non-trivial if $p>1$)
    D.  $0$
    E.  $2$ (the identity subgroup and the group itself)
    ans: D

7.  For $G = \mathbb{Z}$ and $H = p\mathbb{Z}$ (where $p$ is prime), if K is a subgroup such that $p\mathbb{Z} \subseteq K \subseteq \mathbb{Z}$, then:
    A.  $K$ can be any $m\mathbb{Z}$ for $m|p$.
    B.  $K = p\mathbb{Z}$ or $K = \mathbb{Z}$.
    C.  $K = m\mathbb{Z}$ for any $m$ such that $p|m$.
    D.  $K$ must be a finite group.
    E.  There are infinitely many such distinct $K$.
    ans: B

8.  A subgroup $M$ of $G$ is called maximal if $M \neq G$ and for any subgroup $K$ with $M \subseteq K \subseteq G$:
    A.  $K$ must be normal in $G$.
    B.  $K = M$ or $K = G$.
    C.  $K$ must be abelian.
    D.  The index $[G:K]$ is prime.
    E.  $K = M$.
    ans: B

9.  For a prime $p$, the subgroup $p\mathbb{Z}$ of $\mathbb{Z}$ (under addition) is:
    A.  Not normal in $\mathbb{Z}$.
    B.  Normal but not maximal in $\mathbb{Z}$.
    C.  A maximal subgroup of $\mathbb{Z}$.
    D.  The trivial subgroup $\{0\}$.
    E.  The entire group $\mathbb{Z}$ if $p=1$.
    ans: C

10. A field $F$ is a set with two operations, addition ($+$) and multiplication ($\cdot$). Which statement correctly describes the group structures involved?
    A.  $(F, +)$ is an Abelian group, and $(F, \cdot)$ is an Abelian group.
    B.  $(F, +)$ is an Abelian group, and $(F \setminus \{0_F\}, \cdot)$ is an Abelian group, and distributive laws hold.
    C.  $(F, +)$ is a group, and $(F \setminus \{0_F\}, \cdot)$ is a group, and distributive laws hold.
    D.  $(F, +)$ is an Abelian group, and $(F, \cdot)$ is a monoid, and distributive laws hold.
    E.  $(F, +)$ and $(F, \cdot)$ are both rings.
    ans: B

11. In the definition of a field, the additive identity $0_F$ and the multiplicative identity $1_F$ must satisfy:
    A.  $0_F = 1_F$.
    B.  $0_F \neq 1_F$.
    C.  Both must be equal to the same element if the field has only two elements.
    D.  $1_F$ is the additive inverse of $0_F$.
    E.  $0_F$ is the multiplicative inverse of $1_F$.
    ans: B

12. Which of the following sets, under their standard addition and multiplication, is NOT a field?
    A.  $\mathbb{Q}$ (rational numbers)
    B.  $\mathbb{R}$ (real numbers)
    C.  $\mathbb{C}$ (complex numbers)
    D.  $\mathbb{Z}$ (integers)
    E.  $\mathbb{Z}/p\mathbb{Z}$ (where $p$ is a prime number)
    ans: D

13. The simplest field, often denoted $\mathbb{F}_2$ or $\mathbb{Z}/2\mathbb{Z}$, contains exactly:
    A.  One element.
    B.  Two elements.
    C.  Zero elements.
    D.  Infinitely many elements.
    E.  Three elements.
    ans: B

14. In the field $\mathbb{F}_2 = \{0, 1\}$, the sum $1+1$ equals:
    A.  $1$
    B.  $2$ (which is not an element of $\mathbb{F}_2$)
    C.  $0$
    D.  Undefined
    E.  A new element distinct from $0$ and $1$.
    ans: C

15. For which positive integers $n$ does the ring of integers modulo $n$, $\mathbb{Z}/n\mathbb{Z}$, form a field?
    A.  For all $n \ge 1$.
    B.  Only when $n$ is an odd integer.
    C.  Only when $n$ is a prime number.
    D.  Only when $n$ is a power of a prime number.
    E.  Only when $n=2$.
    ans: C

16. If $n$ is a composite number, $\mathbb{Z}/n\mathbb{Z}$ is not a field because:
    A.  Vector addition is not always associative.
    B.  The distributive law fails.
    C.  The zero element $0_F$ does not exist.
    D.  There are non-zero elements that do not have multiplicative inverses.
    E.  $1_F=0_F$ in $\mathbb{Z}/n\mathbb{Z}$ if $n$ is composite.
    ans: D

17. The proof that every non-zero element $\bar{A} \in \mathbb{Z}/p\mathbb{Z}$ (p prime) has a multiplicative inverse relies on the fact that the subgroup $p\mathbb{Z} + A\mathbb{Z}$ of $\mathbb{Z}$ must be:
    A.  Equal to $\mathbb{Z}$ itself.
    B.  Equal to $p\mathbb{Z}$.
    C.  Equal to $A\mathbb{Z}$.
    D.  The trivial subgroup $\{0\}$.
    E.  A finite group.
    ans: A

18. The characteristic of a field $F$ is the smallest positive integer $m$ such that $m \cdot 1_F = 0_F$. If no such $m$ exists, the characteristic is 0. What is the characteristic of the field $\mathbb{Z}/p\mathbb{Z}$ (p prime)?
    A.  $0$
    B.  $1$
    C.  $p$
    D.  $p-1$
    E.  Infinite (This is equivalent to characteristic 0)
    ans: C

19. According to Galois's theory of finite fields, the number of elements in any finite field must be:
    A.  A prime number $p$.
    B.  A power of a prime number, $p^n$, for $n \ge 1$.
    C.  An even number.
    D.  Any positive integer $k$.
    E.  A factorial $k!$.
    ans: B

20. Regarding the existence and uniqueness of finite fields, Galois proved that for each prime power $p^n$ (with $n \ge 1$):
    A.  There are exactly $n$ non-isomorphic fields of order $p^n$.
    B.  There exists a unique field of order $p^n$ (up to isomorphism).
    C.  No field of order $p^n$ exists if $n > 1$.
    D.  Fields of order $p^n$ exist only if $p=2$.
    E.  All fields of order $p^n$ are subfields of $\mathbb{C}$.
    ans: B

21. A vector space $V$ over a field $F$ must, as a fundamental property, be:
    A.  A field.
    B.  An Abelian group under an operation called vector addition.
    C.  A set equipped only with scalar multiplication.
    D.  A non-empty set with no required algebraic structure.
    E.  A ring.
    ans: B

22. Which of the following is a distributive law axiom for a vector space $V$ over a field $F$? (Let $c \in F$, $v, w \in V$)
    A.  $c(vw) = (cv)w$ (This relates to module actions if $V$ is an algebra)
    B.  $c+(v+w) = (c+v)+w$ (This mixes scalar and vector addition incorrectly)
    C.  $c(v+w) = cv + cw$
    D.  $cv = vc$ (Scalar multiplication is not necessarily commutative with vectors themselves, but $c \in F$ is a scalar)
    E.  $c(cv) = (c \cdot c) v$ (This is related to $(ab)v=a(bv)$)
    ans: C

23. In a vector space $V$ over a field $F$, if $0_F$ is the additive identity in $F$ and $v \in V$, then $0_F \cdot v$ (scalar multiplication) is equal to:
    A.  $v$
    B.  $0_V$ (the additive identity vector in $V$)
    C.  $1_F$ (the multiplicative identity in $F$)
    D.  Undefined
    E.  Dependent on the specific vector $v$.
    ans: B

24. In a vector space $V$ over a field $F$, if $1_F$ is the multiplicative identity in $F$ and $v \in V$, then $1_F \cdot v$ (scalar multiplication) is equal to:
    A.  $0_V$
    B.  $v$
    C.  $1_F$ interpreted as a vector
    D.  $-v$
    E.  Dependent on the field $F$.
    ans: B

25. Which of the following is always an example of a vector space over the field $F$?
    A.  The set of $n \times n$ invertible matrices with entries from $F$, under matrix multiplication.
    B.  The field $F$ itself, with scalar multiplication being the field's multiplication.
    C.  The set of integers $\mathbb{Z}$, with $F = \mathbb{Q}$.
    D.  The set of all subgroups of a given Abelian group $A$.
    E.  Any finite set containing at least two distinct elements.
    ans: B

26. For a field $F$, the set $F^n = \{ (a_1, \dots, a_n) \mid a_i \in F \}$ is a vector space. If $c \in F$, scalar multiplication $c \cdot (a_1, \dots, a_n)$ is defined as:
    A.  $(ca_1, a_2, \dots, a_n)$
    B.  $(ca_1, ca_2, \dots, ca_n)$
    C.  $(c+a_1, c+a_2, \dots, c+a_n)$
    D.  $(a_1/c, a_2/c, \dots, a_n/c)$ (assuming $c \neq 0_F$)
    E.  $(c, a_1, \dots, a_n)$ (This would change the dimension/structure)
    ans: B

27. The set $F[X]$ of all polynomials in an indeterminate $X$ with coefficients in a field $F$ forms a vector space over $F$. This vector space is:
    A.  Not a vector space because polynomial multiplication is also defined.
    B.  Finite-dimensional if $F$ is finite.
    C.  Always infinite-dimensional (assuming non-trivial polynomials).
    D.  A field itself.
    E.  A vector space only if $F = \mathbb{R}$ or $F = \mathbb{C}$.
    ans: C

28. A non-empty subset $W$ of a vector space $V$ (over field $F$) is a vector subspace if it is closed under vector addition and:
    A.  $W$ contains the vector $1_F \cdot v$ for some $v \in V$.
    B.  $W$ is closed under scalar multiplication by elements of $F$.
    C.  $W$ has a finite basis.
    D.  All elements of $W$ are non-zero, except possibly $0_V$.
    E.  $W$ itself forms a field under the induced operations.
    ans: B

29. A linear transformation (or homomorphism of vector spaces) $T: V \to W$ (where $V,W$ are vector spaces over the same field $F$) must satisfy $T(v_1+v_2) = T(v_1)+T(v_2)$ for all $v_1, v_2 \in V$, and:
    A.  $T(cv) = T(c)T(v)$ for $c \in F, v \in V$.
    B.  $T(cv) = cT(v)$ for $c \in F, v \in V$.
    C.  $T(cv) = (T(c))v$ for $c \in F, v \in V$.
    D.  $T(V)$ must be equal to $W$ (i.e., $T$ is surjective).
    E.  $T$ must be injective.
    ans: B

30. If $T: V \to W$ is a linear transformation between vector spaces over a field $F$, its kernel, $\text{Ker}(T) = \{v \in V \mid T(v) = 0_W\}$, is always:
    A.  A subspace of $W$.
    B.  A subspace of $V$.
    C.  The zero subspace $\{0_V\}$ if $T$ is non-trivial.
    D.  Isomorphic to the image $\text{Im}(T)$.
    E.  A field.
    ans: B

31. If $T: V \to W$ is a linear transformation between vector spaces over a field $F$, its image, $\text{Im}(T) = \{T(v) \mid v \in V\}$, is always:
    A.  A subspace of $V$.
    B.  A subspace of $W$.
    C.  Equal to $W$ if $T$ is non-trivial.
    D.  Isomorphic to the kernel $\text{Ker}(T)$.
    E.  The set of all non-zero vectors in $W$.
    ans: B

32. If $W$ is a subspace of a vector space $V$ over a field $F$, the quotient space $V/W$ is the set of:
    A.  Elements in $V$ that are not in $W$.
    B.  Subspaces of $V$ properly contained in $W$.
    C.  Cosets of $W$ in $V$, i.e., sets of the form $v+W$ for $v \in V$.
    D.  Linear transformations from $V$ to $W$.
    E.  Elements $v \in V$ such that $vW = Wv$ (this syntax is for group theory).
    ans: C

33. In the quotient vector space $V/W$, scalar multiplication by $c \in F$ is defined for a coset $v+W$ as $c \cdot (v+W) = $:
    A.  $c+(v+W)$
    B.  $v+cW$ (where $cW = \{cw \mid w \in W\}$)
    C.  $cv+W$
    D.  $(c+v)+W$
    E.  $cv+cW$ (This is not a single coset)
    ans: C

34. The natural map $\pi: V \to V/W$ (where $W$ is a subspace of $V$) defined by $\pi(v) = v+W$ is a linear transformation whose kernel is:
    A.  $\{0_V\}$
    B.  $W$
    C.  $V$
    D.  $V/W$
    E.  Undefined for linear transformations.
    ans: B

35. When defining a linear transformation $T: V \to W$, it is fundamental that $V$ and $W$ are vector spaces:
    A.  Over potentially different fields $F_1$ and $F_2$.
    B.  Over the exact same field $F$.
    C.  Exclusively over the field of real numbers $\mathbb{R}$.
    D.  Exclusively over a finite field $\mathbb{F}_q$.
    E.  Over a field of characteristic 0.
    ans: B

36. The lecture emphasizes that a significant portion of linear algebra theory (e.g., concepts of dimension, basis) is independent of:
    A.  The choice of specific vectors.
    B.  Whether the vector space is finite-dimensional or infinite-dimensional.
    C.  The particular choice of the underlying field $F$ (as long as it is a field).
    D.  The axioms governing scalar multiplication.
    E.  The commutativity of the vector addition operation.
    ans: C

37. The vector addition and scalar multiplication operations in the vector space $F^n$ (where $F$ is a field) are defined:
    A.  Using matrix multiplication.
    B.  Component-wise, utilizing the addition and multiplication operations of the field $F$.
    C.  Via a standard dot product inherited from $F$.
    D.  Differently for each specific value of $n$.
    E.  Only if $F$ is the field of real or complex numbers.
    ans: B

38. One of the distributive laws for a vector space $V$ over a field $F$ is $(a+b)v = av+bv$, where $a,b \in F$ and $v \in V$. In this identity:
    A.  The addition $a+b$ is field addition, while $av+bv$ involves vector addition.
    B.  The addition $a+b$ is vector addition, while $av+bv$ involves field addition.
    C.  All addition operations are field additions.
    D.  All addition operations are vector additions.
    E.  This identity is optional for the definition of a vector space.
    ans: A

39. Which mathematician, renowned for foundational work in group theory, also made seminal contributions to the theory and classification of finite fields?
    A.  Niels Henrik Abel
    B.  Carl Friedrich Gauss
    C.  Evariste Galois
    D.  Emil Artin
    E.  Euclid of Alexandria
    ans: C

40. A field $F$ has characteristic $p$ (a prime) if $p \cdot 1_F = 0_F$ (summing $1_F$ to itself $p$ times yields $0_F$). This property implies that such a field $F$:
    A.  Must be isomorphic to $\mathbb{Z}/p\mathbb{Z}$.
    B.  Cannot be embedded as a subfield within the complex numbers $\mathbb{C}$ (which have characteristic 0).
    C.  Must necessarily be an infinite field.
    D.  Has $p$ as its only non-zero element.
    E.  Does not permit division by any of its elements.
    ans: B

41. If $H$ is a normal subgroup of a group $G$, the elements of the quotient group $G/H$ are:
    A.  The elements of $G$ that are not in $H$.
    B.  The subgroups of $G$ that properly contain $H$.
    C.  The distinct cosets of $H$ in $G$.
    D.  The elements of $H$ itself.
    E.  Homomorphisms from $G$ onto $H$.
    ans: C

42. The set of all polynomials $F[X]$ with coefficients from a field $F$, when equipped with standard polynomial addition and scalar multiplication by elements of $F$, forms:
    A.  A field.
    B.  A finite group.
    C.  A vector space over the field $F$.
    D.  A non-abelian group under polynomial multiplication.
    E.  A ring that lacks an additive identity.
    ans: C

43. If $H$ is a normal subgroup of $G$, the natural surjective homomorphism $f: G \to G/H$ defined by $f(g) = gH$ has its kernel $\text{ker}(f)$ equal to:
    A.  The trivial subgroup $\{e\}$ of $G$.
    B.  The subgroup $H$.
    C.  The entire group $G$.
    D.  The quotient group $G/H$.
    E.  The center $Z(G)$.
    ans: B

44. Consider a normal subgroup $H$ of $G$ and the natural projection $\pi: G \to G/H$. If $S'$ is a subgroup of $G/H$, then its inverse image $\pi^{-1}(S')$ is:
    A.  A subgroup of $H$.
    B.  A subgroup of $G$ that contains $H$.
    C.  A subgroup of $G$ that is contained in $H$.
    D.  A normal subgroup of $G/H$.
    E.  Necessarily the trivial subgroup of $G$.
    ans: B

45. The proofs of theorems regarding spanning sets, linear independence, and bases in a vector space over a field $F$ crucially rely on which property of the field $F$?
    A.  $F$ has characteristic 0.
    B.  Every non-zero element in $F$ has a multiplicative inverse.
    C.  $F$ is an ordered field.
    D.  $F$ is finite.
    E.  $F$ contains the real numbers $\mathbb{R}$.
    ans: B

46. A vector $W$ is a linear combination of vectors $V_1, \dots, V_n$ from a vector space $V$ over a field $F$ if:
    A.  $W = V_1 + V_2 + \dots + V_n$.
    B.  $W = A_1 V_1 + A_2 V_2 + \dots + A_n V_n$ for some scalars $A_i \in F$.
    C.  $W$ is a scalar multiple of one of the $V_i$.
    D.  The set $\{W, V_1, \dots, V_n\}$ is linearly dependent.
    E.  $W$ is perpendicular to all $V_i$.
    ans: B

47. The span of a set of vectors $S = \{V_1, \dots, V_n\}$, denoted $\text{Span}(S)$, is:
    A.  The set $S$ itself.
    B.  The set of all scalar multiples of $V_1$.
    C.  The set of all linear combinations of the vectors in $S$.
    D.  The largest vector in $S$.
    E.  The number of vectors in $S$.
    ans: C

48. The span of any finite set of vectors $S$ in a vector space $V$:
    A.  Is always $V$ itself.
    B.  Is a subspace of $V$.
    C.  Contains $S$ but may not be closed under addition.
    D.  Is always the zero vector space $\{0\}$.
    E.  Is a linearly independent set.
    ans: B

49. What is the span of the empty set of vectors, $\text{Span}(\emptyset)$?
    A.  Undefined.
    B.  The empty set itself.
    C.  The entire vector space $V$.
    D.  The zero vector space $\{0\}$.
    E.  A basis for $V$.
    ans: D

50. A vector space $V$ is called finite-dimensional if:
    A.  $V$ contains a finite number of vectors.
    B.  There exists a finite set of vectors $S$ in $V$ such that $\text{Span}(S) = V$.
    C.  Every vector in $V$ has a finite number of components.
    D.  The underlying field $F$ is finite.
    E.  $V$ is isomorphic to $\mathbb{R}^n$ for some $n$.
    ans: B

51. The vector space $F^n$ (n-tuples of elements from field $F$) is finite-dimensional because:
    A.  It has exactly $n$ vectors.
    B.  It is spanned by the $n$ standard basis vectors $e_i = (0, \dots, 1, \dots, 0)$.
    C.  The field $F$ must be finite.
    D.  All its vectors have finite length.
    E.  It is a subspace of $F^{n+1}$.
    ans: B

52. Why is the vector space $F[x]$ of polynomials in $x$ with coefficients in a field $F$ NOT finite-dimensional?
    A.  It contains infinitely many polynomials.
    B.  Any finite set of polynomials has a maximum degree, and their span cannot produce polynomials of higher degree.
    C.  The field $F$ must be infinite.
    D.  Polynomials cannot be added.
    E.  $F[x]$ does not have a zero vector.
    ans: B

53. A set of vectors $\{V_1, \dots, V_n\}$ is linearly independent if the relation $A_1 V_1 + \dots + A_n V_n = 0$ (where $0$ is the zero vector):
    A.  Holds for any scalars $A_i$.
    B.  Only holds if all $V_i$ are the zero vector.
    C.  Only holds if all scalars $A_i$ are zero.
    D.  Implies that the vectors span the space.
    E.  Means no $V_i$ is a multiple of another $V_j$.
    ans: C

54. Consider the vectors $V_1 = (1,0,0)$, $V_2 = (1,1,0)$, and $V_3 = (1,2,3)$ in $\mathbb{R}^3$. These vectors are:
    A.  Linearly dependent because $V_2$ contains $V_1$.
    B.  Linearly independent.
    C.  A spanning set for the $xy$-plane only.
    D.  Not a basis because there are 3 vectors in $\mathbb{R}^3$.
    E.  Linearly dependent because $1+1+1 \neq 0$.
    ans: B

55. The property of linear independence for a collection of vectors $\{V_1, \dots, V_n\}$:
    A.  Depends on the order in which the vectors are listed.
    B.  Depends only on the set of vectors, irrespective of order.
    C.  Is only defined if $n$ is the dimension of the space.
    D.  Implies that the set must span the vector space.
    E.  Is equivalent to each vector being non-zero.
    ans: B

56. An ordered set of vectors $(V_1, \dots, V_n)$ forms a basis for a vector space $V$ if:
    A.  The set spans $V$.
    B.  The set is linearly independent.
    C.  The set spans $V$ AND is linearly independent.
    D.  $n$ is equal to the number of elements in the field $F$.
    E.  Every vector in $V$ is one of the $V_i$.
    ans: C

57. If $(V_1, \dots, V_n)$ is a basis for $V$, then any vector $W \in V$:
    A.  Can be written as a linear combination of $V_1, \dots, V_n$ in multiple ways.
    B.  Is equal to one of the $V_i$.
    C.  Can be uniquely expressed as a linear combination $A_1 V_1 + \dots + A_n V_n$.
    D.  Must be linearly independent of the basis vectors.
    E.  Has $A_i = 1$ for all $i$ in its linear combination.
    ans: C

58. A basis $(V_1, \dots, V_n)$ for a vector space $V$ over a field $F$ gives rise to an isomorphism $f: V \to F^n$. This map $f$ takes a vector $W \in V$ to:
    A.  The sum of its components.
    B.  The tuple of unique scalar coefficients $(A_1, \dots, A_n)$ such that $W = \sum A_i V_i$.
    C.  The first basis vector $V_1$.
    D.  A single scalar in $F$.
    E.  The zero vector in $F^n$ if $W \neq 0$.
    ans: B

59. The isomorphism $f: V \to F^n$ induced by a basis $(V_1, \dots, V_n)$ is a homomorphism. This means if $W = \sum A_i V_i$ and $W' = \sum B_i V_i$:
    A.  $f(W \cdot W') = f(W) \cdot f(W')$.
    B.  $f(W + W') = (A_1+B_1, \dots, A_n+B_n)$.
    C.  $f(W)$ is always the same as $f(V_1)$.
    D.  $V$ must be equal to $F^n$.
    E.  The sum of coefficients $A_i$ must be 1.
    ans: B

60. Which theorem states that if a finite set $S$ spans a vector space $V$, then some subset of $S$ forms a basis for $V$?
    A.  The Dimension Theorem.
    B.  The theorem that allows extending a linearly independent set to a basis.
    C.  The theorem that states any spanning set contains a basis.
    D.  Cayley-Hamilton Theorem.
    E.  The Main Theorem relating sizes of spanning and linearly independent sets.
    ans: C

61. The proof that a spanning set $S$ contains a basis involves iteratively:
    A.  Adding vectors from $V$ to $S$ until it becomes linearly independent.
    B.  If $S$ is linearly dependent, finding a vector in $S$ that is a linear combination of others and removing it, without changing the span.
    C.  Taking scalar multiples of vectors in $S$.
    D.  Ensuring all vectors in $S$ are non-zero.
    E.  Ordering the vectors in $S$ alphabetically.
    ans: B

62. Which theorem states that any linearly independent set $L$ in a finite-dimensional vector space $V$ can be extended to form a basis for $V$?
    A.  The Basis Uniqueness Theorem.
    B.  The theorem that allows extending a linearly independent set to a basis.
    C.  The Spanning Set Reduction Theorem.
    D.  The Rank-Nullity Theorem.
    E.  The Isomorphism Theorem for Vector Spaces.
    ans: B

63. The proof that a linearly independent set $L$ can be extended to a basis involves iteratively:
    A.  Removing vectors from $L$ if it doesn't span $V$.
    B.  If $L$ does not span $V$, finding a vector $v$ (from a known finite spanning set of $V$) not in $\text{Span}(L)$ and adding $v$ to $L$, maintaining linear independence.
    C.  Replacing vectors in $L$ with their negatives.
    D.  Verifying that $L$ is not the empty set.
    E.  Calculating the determinant of a matrix formed by vectors in $L$.
    ans: B

64. The "Main Theorem" discussed in the lecture states that if $S = \{V_1, \dots, V_n\}$ spans $V$ and $L = \{W_1, \dots, W_m\}$ is a linearly independent set in $V$, then:
    A.  $m > n$.
    B.  $m = n$.
    C.  $m \le n$.
    D.  $S$ must be a subset of $L$.
    E.  $L$ must be a subset of $S$.
    ans: C

65. The proof of the Main Theorem ($m \le n$) involves expressing each $W_j = \sum_{i=1}^n A_{ij} V_i$ and considering a linear relation $\sum_{j=1}^m C_j W_j = 0$. This leads to a system of:
    A.  $m$ linear equations in $n$ unknowns $C_j$.
    B.  $n$ linear equations in $m$ unknowns $C_j$.
    C.  $m \times n$ non-linear equations.
    D.  $n$ quadratic equations in $m$ unknowns $V_i$.
    E.  $m$ equations for the $A_{ij}$.
    ans: B

66. In the proof of the Main Theorem, if $m > n$ (more linearly independent vectors than spanning vectors), this would imply:
    A.  The spanning set $S$ was not minimal.
    B.  The linearly independent set $L$ was not maximal.
    C.  A system of $n$ linear equations in $m$ unknowns $C_j$ (with $m>n$) has a non-trivial solution for $C_j$.
    D.  All $A_{ij}$ must be zero.
    E.  The field $F$ must be $\mathbb{R}$.
    ans: C

67. A crucial algebraic fact used in concluding the Main Theorem (if $m>n$, then $L$ is linearly dependent) is that a system of homogeneous linear equations with more unknowns than equations:
    A.  Has only the trivial solution.
    B.  Always has a non-trivial solution.
    C.  May or may not have a non-trivial solution, depending on the coefficients.
    D.  Is inconsistent.
    E.  Requires the determinant of the coefficient matrix to be non-zero.
    ans: B

68. A fundamental corollary of the Main Theorem is that all bases of a finite-dimensional vector space $V$:
    A.  Are subsets of each other.
    B.  Contain the same number of elements.
    C.  Must include the zero vector.
    D.  Are infinite if $V$ is not the zero space.
    E.  Consist of orthogonal vectors.
    ans: B

69. The dimension of a finite-dimensional vector space $V$, denoted $\text{dim}(V)$, is defined as:
    A.  The number of elements in $V$.
    B.  The number of elements in any basis of $V$.
    C.  The maximum number of linearly dependent vectors in $V$.
    D.  The number of elements in the underlying field $F$.
    E.  The smallest $n$ such that $V$ is a subspace of $F^n$.
    ans: B

70. What is the dimension of the zero vector space $\{0\}$?
    A.  Undefined.
    B.  0.
    C.  1.
    D.  Infinite.
    E.  Depends on the field $F$.
    ans: B

71. What is the dimension of the vector space $F^n$ over the field $F$?
    A.  $n^2$.
    B.  $2n$.
    C.  $n$.
    D.  $1$.
    E.  Infinite if $F$ is infinite.
    ans: C

72. If $S$ is a finite set of vectors that spans $V$, and $\text{dim}(V) = d$, then the number of elements in $S$, $|S|$, must satisfy:
    A.  $|S| < d$.
    B.  $|S| = d$.
    C.  $|S| \ge d$.
    D.  $|S| = d!$.
    E.  $|S|$ can be any positive integer.
    ans: C

73. If $L$ is a linearly independent set of vectors in $V$, and $\text{dim}(V) = d$, then the number of elements in $L$, $|L|$, must satisfy:
    A.  $|L| > d$.
    B.  $|L| = d$.
    C.  $|L| \le d$.
    D.  $|L| = 0$.
    E.  $|L|$ can be any positive integer.
    ans: C

74. If $W$ is a subspace of a finite-dimensional vector space $V$, and $(W_1, \dots, W_m)$ is a basis for $W$, then:
    A.  This basis cannot be extended to a basis for $V$.
    B.  This basis can be extended to a basis for $V$, say $(W_1, \dots, W_m, V_{m+1}, \dots, V_d)$.
    C.  $V$ must be equal to $W$.
    D.  Any basis for $V$ must contain $(W_1, \dots, W_m)$ as its first $m$ vectors.
    E.  $\text{dim}(W) > \text{dim}(V)$.
    ans: B

75. If $(W_1, \dots, W_m)$ is a basis for a subspace $W \subset V$, and $(W_1, \dots, W_m, V_{m+1}, \dots, V_d)$ is an extended basis for $V$, then a basis for the quotient space $V/W$ is formed by:
    A.  The set $\{W_1+W, \dots, W_m+W\}$.
    B.  The set $\{V_{m+1}+W, \dots, V_d+W\}$.
    C.  The entire set $\{W_1+W, \dots, V_d+W\}$.
    D.  Any $d-m$ vectors from $V$.
    E.  The zero vector in $V/W$.
    ans: B

76. For a finite-dimensional vector space $V$ and a subspace $W$, the dimension formula states:
    A.  $\text{dim}(V) = \text{dim}(W) \cdot \text{dim}(V/W)$.
    B.  $\text{dim}(V) = \text{dim}(W) + \text{dim}(V/W)$.
    C.  $\text{dim}(V) = \text{dim}(W) - \text{dim}(V/W)$.
    D.  $\text{dim}(V/W) = \text{dim}(V) + \text{dim}(W)$.
    E.  $\text{dim}(V) = \text{max}(\text{dim}(W), \text{dim}(V/W))$.
    ans: B

77. Given a subspace $W$ of $V$, and a basis $(V_{m+1}, \dots, V_d)$ for a complementary space $W'$ such that their images form a basis for $V/W$. The subspace $W' = \text{Span}(V_{m+1}, \dots, V_d)$ has the property that:
    A.  $W' = W$.
    B.  $W'$ is isomorphic to $V/W$.
    C.  $W' = \{0\}$.
    D.  $W \cap W' = W'$.
    E.  $\text{dim}(W') = \text{dim}(V)$.
    ans: B

78. Consider the group $G = \mathbb{Z}/4\mathbb{Z}$ and its subgroup $H = 2\mathbb{Z}/4\mathbb{Z} \cong \mathbb{Z}/2\mathbb{Z}$. The quotient group $G/H \cong \mathbb{Z}/2\mathbb{Z}$. Can we always find another subgroup $H' \subset G$, $H' \neq H$, such that $H' \cong G/H$ and $G \cong H \times H'$?
    A.  Yes, this is always possible for finite groups.
    B.  No, in this specific example, the only subgroup of order 2 is $H$ itself.
    C.  Yes, if $G$ is abelian.
    D.  No, because $G/H$ is trivial.
    E.  Yes, $H'$ can be chosen as $G$ itself.
    ans: B

79. The fact that for a subspace $W \subset V$, we can find a subspace $W' \subset V$ such that $V = W \oplus W'$ (meaning $W \cap W' = \{0\}$ and $W+W'=V$), where $W' \cong V/W$, is a property that:
    A.  Holds for all abelian groups and their subgroups.
    B.  Is specific to vector spaces (and more generally, free modules over certain rings).
    C.  Only holds if $W$ is the zero subspace.
    D.  Requires $V$ to be an inner product space.
    E.  Is true for groups but not for vector spaces.
    ans: B

80. The ability to "lift" the quotient space $V/W$ to a subspace $W'$ within $V$ such that $V \cong W \oplus V/W$ (identifying $V/W$ with $W'$) is a consequence of:
    A.  The underlying field being $\mathbb{R}$.
    B.  The existence of bases and the ability to extend a basis of $W$ to a basis of $V$.
    C.  The commutativity of vector addition.
    D.  The finite dimensionality of $W$ only, $V$ can be infinite.
    E.  All subspaces being normal (which is always true for the additive group of a vector space).
    ans: B

81. If $(V_1, \dots, V_n)$ is a basis for $V$, and a vector $W \in V$ has coordinates $(0, \dots, 0)$ with respect to this basis, then:
    A.  $W$ is one of the basis vectors $V_i$.
    B.  $W$ is the zero vector.
    C.  This situation is impossible unless $n=0$.
    D.  $W$ is linearly independent of all $V_i$.
    E.  The basis is not valid.
    ans: B

82. If $S_1$ is a finite spanning set for $V$ and $S_2 \subset S_1$ is a basis for $V$, and $S_1 \neq S_2$, then $S_1$ must have been:
    A.  Linearly independent.
    B.  Linearly dependent.
    C.  The empty set.
    D.  A proper subset of $S_2$.
    E.  A set containing the zero vector.
    ans: B

83. If a set of vectors $\{V_1, \dots, V_n\}$ is linearly dependent, and not all vectors are zero, then:
    A.  All vectors must be multiples of $V_1$.
    B.  At least one vector $V_k$ can be expressed as a linear combination of the other vectors in the set.
    C.  The set must span the entire vector space.
    D.  All scalars in any linear combination summing to zero must be non-zero.
    E.  $n$ must be greater than the dimension of the space.
    ans: B

84. If $L = \{W_1, \dots, W_m\}$ is a linearly independent set and a vector $v$ is NOT in $\text{Span}(L)$, then the set $L' = L \cup \{v\}$ is:
    A.  Always linearly dependent.
    B.  Always linearly independent.
    C.  Spans the entire vector space.
    D.  Equal to $L$.
    E.  The empty set.
    ans: B

85. The primary significance of a basis $(V_1, \dots, V_n)$ providing a *unique* linear combination $W = \sum A_i V_i$ for every vector $W \in V$ is that:
    A.  It simplifies addition of vectors.
    B.  It allows defining coordinates $(A_1, \dots, A_n)$ for $W$ unambiguously, establishing an isomorphism $V \cong F^n$.
    C.  It proves the vector space is finite.
    D.  It means all $A_i$ must be non-zero.
    E.  It guarantees the $V_i$ are orthogonal.
    ans: B

86. When a basis $(V_1, \dots, V_n)$ induces an isomorphism $f: V \to F^n$, the "onto" property of $f$ means that:
    A.  Every vector in $V$ maps to the zero vector in $F^n$.
    B.  For any tuple of scalars $(A_1, \dots, A_n) \in F^n$, there exists a vector $W = \sum A_i V_i$ in $V$ that maps to it.
    C.  Different vectors in $V$ map to different tuples in $F^n$.
    D.  $V$ contains more vectors than $F^n$.
    E.  The scalars $A_i$ must be integers.
    ans: B

87. When a basis $(V_1, \dots, V_n)$ induces an isomorphism $f: V \to F^n$, the "one-to-one" (injective) property of $f$ means that:
    A.  If $f(W) = (0, \dots, 0)$, then $W$ must be the zero vector in $V$.
    B.  Every tuple in $F^n$ is the image of some vector in $V$.
    C.  $V$ and $F^n$ are the same set.
    D.  The map $f$ preserves scalar multiplication but not necessarily addition.
    E.  Any vector $W$ can be written as $\sum A_i V_i$.
    ans: A

88. The lecture begins by recalling a result from the previous session: a linearly independent subset `S` of a finite-dimensional vector space `V` can be:
    A.  Shrunk to form a basis of `V`.
    B.  Extended to form a basis of `V`.
    C.  Is always already a basis of `V`.
    D.  Used to span a subspace that is necessarily smaller than `V`.
    E.  Replaced by an entirely different set to form a basis.
    ans: B

89. If `V` has a basis `\{v_1, ..., v_m\}`, and `W = \text{span}(v_1, ..., v_n)` and `W' = \text{span}(v_{n+1}, ..., v_m)` where `n < m`, then the intersection `W \cap W'` is:
    A.  `W`
    B.  `W'`
    C.  `\{0\}` (the zero vector space)
    D.  `V`
    E.  A non-trivial subspace if `n > 0`.
    ans: C

90. The fact that `W \cap W' = \{0\}` (using notation from the previous question) primarily relies on which property of the set `\{v_1, ..., v_m\}`?
    A.  It spans `V`.
    B.  It is linearly independent.
    C.  `V` is finite-dimensional.
    D.  The underlying field `F` is `\mathbb{R}`.
    E.  The definition of a subspace.
    ans: B

91. Given `W = \text{span}(v_1, ..., v_n)` and `W' = \text{span}(v_{n+1}, ..., v_m)` from a basis of `V`, the map `\phi: W \times W' \to V` defined by `\phi(w, w') = w + w'` is:
    A.  Only injective.
    B.  Only surjective.
    C.  A linear isomorphism.
    D.  Not necessarily a linear transformation.
    E.  An isomorphism only if `W=V` or `W' = \{0\}`.
    ans: C

92. The surjectivity of the map `\phi(w, w') = w + w'` from `W \times W' \to V` (context from the previous question) primarily follows from:
    A.  `W \cap W' = \{0\}`.
    B.  The property that the set `\{v_1, ..., v_m\}` spans `V`.
    C.  The component-wise definition of addition in `W \times W'`.
    D.  `V` being a finite-dimensional vector space.
    E.  The linear independence of `\{v_1, ..., v_m\}`.
    ans: B

93. The injectivity of the map `\phi(w, w') = w + w'` from `W \times W' \to V` primarily follows from:
    A.  `W \cap W' = \{0\}`.
    B.  The property that the set `\{v_1, ..., v_m\}` spans `V`.
    C.  The component-wise definition of scalar multiplication in `W \times W'`.
    D.  The underlying field `F` being infinite.
    E.  The dimension of `V`.
    ans: A

94. If `W` is a subspace of a finite-dimensional vector space `V`, the lecture states there exists another subspace `W'` of `V` such that the canonical map `W' \to V/W` (sending `w' \in W'` to the coset `w' + W`) is:
    A.  Always the zero map.
    B.  An injective linear transformation but not necessarily surjective.
    C.  A surjective linear transformation but not necessarily injective.
    D.  A linear isomorphism.
    E.  Not well-defined unless `W = \{0\}`.
    ans: D

95. In proving `W' \cong V/W` (where `W` is a subspace of `V`), how is the subspace `W'` typically constructed?
    A.  As the orthogonal complement of `W` (assuming an inner product).
    B.  By taking a basis of `W`, extending it to a basis of `V`, and `W'` is the span of the original basis vectors of `W`.
    C.  By taking a basis of `W`, extending it to a basis of `V`, and `W'` is the span of the basis vectors added to extend the basis of `W`.
    D.  As `V` itself.
    E.  As the kernel of a projection map onto `W`.
    ans: C

96. For any subspace `W` of a finite-dimensional vector space `V`, which of the following isomorphisms holds?
    A.  `V \cong W / (V/W)`
    B.  `V \cong W \times (V/W)`
    C.  `V/W \cong V \times W`
    D.  `W \cong V \times (V/W)`
    E.  `V \cong W + (V/W)` (where + denotes addition of subspaces not Cartesian product)
    ans: B

97. The isomorphism `V \cong W \times (V/W)` for a subspace `W` of `V` implies which relationship for their dimensions?
    A.  `\dim(V) = \dim(W) \cdot \dim(V/W)`
    B.  `\dim(V) = \dim(W) - \dim(V/W)`
    C.  `\dim(V) = \dim(W) + \dim(V/W)`
    D.  `\dim(V) = \dim(V/W) - \dim(W)`
    E.  `\dim(V) = \max(\dim(W), \dim(V/W))`
    ans: C

98. For a linear transformation `F: V \to U`, the First Isomorphism Theorem for vector spaces states that `V/\text{ker}(F)` is linearly isomorphic to:
    A.  `U`
    B.  `\text{ker}(F)`
    C.  `\text{Im}(F)`
    D.  `V`
    E.  `U/\text{Im}(F)`
    ans: C

99. By combining the First Isomorphism Theorem (`V/\text{ker}(F) \cong \text{Im}(F)`) with the result `V \cong W \times (V/W)` (letting `W=\text{ker}(F)`), for a linear map `F: V \to U`, we establish that:
    A.  `V \cong \text{ker}(F) \times U`
    B.  `V \cong V/\text{ker}(F) \times \text{Im}(F)`
    C.  `V \cong \text{ker}(F) \times \text{Im}(F)`
    D.  `U \cong \text{ker}(F) \times \text{Im}(F)`
    E.  `V/\text{Im}(F) \cong \text{ker}(F)`
    ans: C

100. The Rank-Nullity Theorem, `\dim(V) = \dim(\text{ker}(F)) + \dim(\text{Im}(F))`, is a direct consequence of which isomorphism for a linear map `F: V \to U`?
    A.  `V \cong U`
    B.  `V \cong \text{ker}(F) \times \text{Im}(F)`
    C.  `\text{ker}(F) \cong \text{Im}(F)`
    D.  `V/\text{ker}(F) \cong U`
    E.  `V \cong \text{ker}(F) / \text{Im}(F)`
    ans: B

101. The lecture notes that finding the kernel and image of a homomorphism is:
    A.  Universally easy for all types of groups.
    B.  Relatively easy for linear transformations between vector spaces but can be very difficult for general groups.
    C.  Generally difficult for vector spaces but straightforward for finite groups.
    D.  Always an unsolved problem in abstract algebra.
    E.  Solvable by a single, universal algorithm applicable to all algebraic structures.
    ans: B

102. The comparative ease of determining kernels and images for linear transformations in vector spaces is primarily attributed to:
    A.  The fact that all vector spaces are abelian under addition.
    B.  The existence of bases, matrix representations, and associated matrix algorithms like row reduction.
    C.  The property that all linear transformations are surjective.
    D.  The restriction that the underlying field `F` must be `\mathbb{R}` or `\mathbb{C}`.
    E.  The finite dimensionality of all vector spaces encountered in practical applications.
    ans: B

103. There is a one-to-one correspondence between ordered bases of an `n`-dimensional vector space `V` over a field `F` and:
    A.  Linear transformations from `V` to `F^n`.
    B.  Linear isomorphisms from `F^n` to `V`.
    C.  All possible subspaces of `V`.
    D.  `n \times n` matrices with entries in `F`.
    E.  The set of all individual vectors in `V`.
    ans: B

104. Given an ordered basis `B = \{v_1, ..., v_n\}` of a vector space `V`, the associated isomorphism `\rho_B: F^n \to V` maps a column vector `(a_1, ..., a_n)^T \in F^n` to:
    A.  The tuple `(a_1v_1, ..., a_nv_n) \in V^n`.
    B.  The linear combination `\sum_{i=1}^n a_i v_i \in V`.
    C.  The product `\prod_{i=1}^n a_i v_i` (if defined).
    D.  The matrix whose columns are the vectors `a_i v_i`.
    E.  The vector `(v_1/a_1, ..., v_n/a_n)` (if defined).
    ans: B

105. Conversely, given a linear isomorphism `\rho: F^n \to V`, the corresponding ordered basis for `V` consists of the set of vectors:
    A.  `\{\rho(v) \mid v \text{ is any vector in } F^n\}`.
    B.  `\{\rho(e_1), ..., \rho(e_n)\}` where `e_i` are the standard basis vectors of `F^n`.
    C.  `\{\rho^{-1}(e_1), ..., \rho^{-1}(e_n)\}` where `e_i` are standard basis vectors of `F^n`.
    D.  The columns of the matrix representation of `\rho` with respect to the standard basis of `F^n`.
    E.  Any set of `n` linearly independent vectors chosen from the image `\text{Im}(\rho)`.
    ans: B

106. Linear transformations from `F^n` to `F^m` (with respect to the standard bases for `F^n` and `F^m`) are in one-to-one correspondence with:
    A.  `n \times m` matrices over the field `F`.
    B.  `m \times n` matrices over the field `F`.
    C.  `n \times n` invertible matrices over `F`.
    D.  `(m+n) \times 1` column vectors over `F`.
    E.  Polynomials of degree `\max(n,m)` with coefficients in `F`.
    ans: B

107. If `F: F^n \to F^m` is a linear transformation, the `j`-th column of its matrix representation `[F]` (with respect to standard bases) is the vector:
    A.  `F(u_j)` where `u_j` is the `j`-th standard basis vector of `F^m`.
    B.  `F(e_j)` where `e_j` is the `j`-th standard basis vector of `F^n`.
    C.  The `j`-th row of the matrix `F` applied to the first standard basis vector `e_1`.
    D.  The standard basis vector `e_j \in F^n` itself.
    E.  The solution vector `x` to the equation `F(x) = e_j`.
    ans: B

108. If `F_1, F_2: F^n \to F^m` are linear transformations and `c_1, c_2` are scalars from `F`, then the matrix `[c_1F_1 + c_2F_2]` is equal to:
    A.  `c_1[F_1] + c_2[F_2]`
    B.  `(c_1+c_2)([F_1]+[F_2])`
    C.  `c_1c_2[F_1F_2]` (where `[F_1F_2]` denotes a product of matrices if defined)
    D.  `[F_1][c_1I] + [F_2][c_2I]` (where `I` is an identity matrix)
    E.  This algebraic structure is not preserved by matrix representation.
    ans: A

109. If `F_2: F^k \to F^n` and `F_1: F^n \to F^m` are linear transformations, then the matrix of their composition `[F_1 \circ F_2]` (mapping `F^k \to F^m`) is equal to:
    A.  `[F_1] + [F_2]` (if `m=k`)
    B.  `[F_2][F_1]` (matrix product)
    C.  `[F_1][F_2]` (matrix product)
    D.  `[F_1] \otimes [F_2]` (Kronecker product)
    E.  `[F_2 \circ F_1]`
    ans: C

110. Let `F: V \to V'` be a linear transformation, `B` an ordered basis for `V`, and `B'` an ordered basis for `V'`. The matrix of `F` with respect to bases `B` and `B'`, denoted `[F]_{B,B'}`, is defined as the matrix representation of the composite map:
    A.  `\rho_B \circ F \circ \rho_{B'}^{-1}`
    B.  `\rho_{B'}^{-1} \circ F \circ \rho_B`
    C.  `F \circ \rho_B \circ \rho_{B'}^{-1}`
    D.  `\rho_B \circ \rho_{B'}^{-1} \circ F`
    E.  The matrix whose columns are `F(v)` for `v \in B`, expressed in standard coordinates.
    ans: B

111. If `F: V \to V'`, `B=\{v_1,...,v_n\}` is an ordered basis for `V`, `B'=\{w_1,...,w_m\}` is an ordered basis for `V'`, and `F(v_j) = \sum_{i=1}^m a_{ij} w_i`, then the scalar `a_{ij}` is the entry in which position of the matrix `[F]_{B,B'}`?
    A.  `i`-th row and `j`-th column.
    B.  `j`-th row and `i`-th column.
    C.  `i`-th diagonal position (only if `i=j` and `m=n`).
    D.  Last (`m`-th) row and `j`-th column.
    E.  `i`-th row and first (`1`st) column.
    ans: A

112. Let `[F]_{B_1,B_1'}` be the matrix of `F: V \to V'`. Let `P = \rho_{B_1}^{-1} \rho_{B_2}` be the change of basis matrix in `V` (coordinates from `B_2` to `B_1`), and `Q_m = \rho_{B_1'}^{-1} \rho_{B_2'}` be the change of basis matrix in `V'` (coordinates from `B_2'` to `B_1'`). Then `[F]_{B_2,B_2'}` is given by:
    A.  `P [F]_{B_1,B_1'} Q_m`
    B.  `Q_m^{-1} [F]_{B_1,B_1'} P`
    C.  `P^{-1} [F]_{B_1,B_1'} Q_m`
    D.  `Q_m [F]_{B_1,B_1'} P^{-1}`
    E.  `[F]_{B_1,B_1'} P Q_m^{-1}`
    ans: B

113. Consider a linear operator `F: V \to V`. Let `B_1, B_2` be two ordered bases for `V`. If `P = \rho_{B_1}^{-1} \rho_{B_2}` is the change of basis matrix (transforming coordinates with respect to `B_2` into coordinates with respect to `B_1`), then `[F]_{B_2,B_2}` is related to `[F]_{B_1,B_1}` by:
    A.  `P [F]_{B_1,B_1} P^{-1}`
    B.  `P^{-1} [F]_{B_1,B_1} P`
    C.  `P [F]_{B_1,B_1} P`
    D.  `P^{-1} [F]_{B_1,B_1} P^{-1}`
    E.  `[F]_{B_1,B_1}` (it does not change)
    ans: B

114. The relationship `[F]_{B_2,B_2} = P^{-1} [F]_{B_1,B_1} P` between matrix representations of an operator `F: V \to V` under different bases is known in group theory as:
    A.  Commutation.
    B.  Association.
    C.  Conjugation.
    D.  Inversion.
    E.  Transposition.
    ans: C

115. The set `GL(V)` is defined as the set of:
    A.  All linear transformations from `V` to `V`.
    B.  All injective linear transformations from `V` to `V`.
    C.  All surjective linear transformations from `V` to `V`.
    D.  All linear isomorphisms from `V` to `V` (invertible linear transformations).
    E.  All ordered bases of `V`.
    ans: D

116. `GL(V)` forms a group under which operation?
    A.  Addition of functions.
    B.  Composition of functions.
    C.  Pointwise multiplication of function values.
    D.  Matrix addition (after fixing a basis).
    E.  Direct sum of transformations.
    ans: B

117. If `V` is an `n`-dimensional vector space over a field `F`, choosing an ordered basis `B` for `V` establishes a group isomorphism between `GL(V)` and:
    A.  `M_n(F)` (the ring of all `n \times n` matrices over `F`).
    B.  `SL_n(F)` (the special linear group of `n \times n` matrices with determinant 1).
    C.  `GL_n(F)` (the general linear group of `n \times n` invertible matrices over `F`).
    D.  `F^n` (the vector space of `n`-tuples).
    E.  The symmetric group `S_n`.
    ans: C

118. The lecture notation `\text{Hom}(V,V)^*` for `GL(V)` implies that `GL(V)` consists of the invertible elements (units) of the ring `\text{Hom}(V,V)` (linear maps from `V` to `V`). The `*` signifies:
    A.  The dual space.
    B.  The set of units (invertible elements with respect to multiplication/composition).
    C.  Complex conjugation.
    D.  The zero map.
    E.  Adjoint transformation.
    ans: B

119. When a linear transformation `F: V \to U` is represented by a matrix `A` (with respect to chosen bases for `V` and `U`), the image of `F`, `\text{Im}(F)`, corresponds to which vector space associated with the matrix `A`?
    A.  The null space of `A`.
    B.  The row space of `A`.
    C.  The column space of `A`.
    D.  The space spanned by the eigenvectors of `A`.
    E.  The space of solutions to `Ax=0`.
    ans: C

120. Similarly, when `F: V \to U` is represented by matrix `A`, the kernel of `F`, `\text{ker}(F)`, corresponds to which vector space associated with `A`?
    A.  The null space of `A` (or kernel of `A`).
    B.  The row space of `A`.
    C.  The column space of `A`.
    D.  The space spanned by the rows of `A`.
    E.  The image of `A^T`.
    ans: A

121. Which standard matrix algorithm is commonly employed to find bases for the column space and null space of a matrix?
    A.  Gaussian elimination (Row reduction to echelon form).
    B.  QR decomposition.
    C.  Singular Value Decomposition (SVD).
    D.  Gram-Schmidt orthogonalization process.
    E.  Jacobi or Gauss-Seidel iterative methods.
    ans: A

122. The property that for a subspace `W \subseteq V`, `V` is isomorphic to `W \times (V/W)` signifies that the short exact sequence `0 \to W \to V \to V/W \to 0` for vector spaces:
    A.  Rarely exists.
    B.  Is exact only if `V` is over `\mathbb{R}`.
    C.  Always splits.
    D.  Implies `W` must be the trivial subspace `\{0\}`.
    E.  Implies `V/W` must be the trivial subspace `\{0\}`.
    ans: C

123. The induced map `F_{bar}: V/\text{ker}(F) \to \text{Im}(F)` from the First Isomorphism Theorem, defined by `F_{bar}(v + \text{ker}(F)) = F(v)`, is:
    A.  Well-defined only if `F` is surjective onto `U`.
    B.  A linear isomorphism.
    C.  Injective if and only if `\text{ker}(F) = \{0\}`.
    D.  A group homomorphism but not necessarily a linear transformation.
    E.  Always a map from `V/\text{ker}(F)` to the codomain `U`, not necessarily restricted to `\text{Im}(F)`.
    ans: B

124. The algebraic rule `[F_1 \circ F_2] = [F_1][F_2]` (where `[\cdot]` denotes matrix representation) is fundamental because it:
    A.  Simplifies the process of adding linear transformations.
    B.  Demonstrates that matrix multiplication is inherently commutative.
    C.  Translates the abstract operation of function composition into an algorithmic matrix multiplication.
    D.  Provides a method to define the inverse of a linear transformation.
    E.  Is valid only when `F_1` and `F_2` are represented by square matrices.
    ans: C

125. The map `\rho_B: F^n \to V` constructed from an ordered basis `B = \{v_1, ..., v_n\}` of `V` takes a coordinate vector `(a_1, ..., a_n)^T \in F^n` and produces:
    A.  A new coordinate vector with respect to a different basis of `V`.
    B.  A scalar value, such as the length of the resulting vector.
    C.  The unique vector in `V` that is the linear combination `a_1v_1 + ... + a_nv_n`.
    D.  The `n \times n` matrix `[B]` whose columns are `v_i`.
    E.  The coordinate vector of the inverse element in `V`.
    ans: C

126. The inverse map `\rho_B^{-1}: V \to F^n` (associated with basis `B` of `V`) performs which function?
    A.  Constructs the basis `B` from the vector space `V`.
    B.  Multiplies a vector from `V` by a sequence of scalars from `F^n`.
    C.  Determines the unique `n`-tuple of coordinates in `F^n` for any given vector `v \in V` with respect to basis `B`.
    D.  Projects the vector space `V` onto its subspace `F^n`.
    E.  Verifies the linear independence of the basis `B`.
    ans: C

127. The change of basis matrix `P = \rho_{B_1}^{-1} \rho_{B_2}` (where `B_1, B_2` are bases of `V`) transforms:
    A.  Coordinates of a vector with respect to basis `B_1` into coordinates with respect to basis `B_2`.
    B.  Coordinates of a vector with respect to basis `B_2` into coordinates with respect to basis `B_1`.
    C.  The basis vectors of `B_1` into the basis vectors of `B_2`.
    D.  The basis vectors of `B_2` into the basis vectors of `B_1`.
    E.  A linear operator `F` from its `B_1` matrix to its `B_2` matrix directly by `[F]_{B_2} = P[F]_{B_1}`.
    ans: B

128. `GL(V)` can be understood as the group of automorphisms of `V` that preserve the vector space structure. This means they preserve vector addition and:
    A.  A specific inner product or metric on `V`.
    B.  The ordering of elements in any chosen basis.
    C.  Scalar multiplication by elements of the field `F`.
    D.  Only the origin of the vector space `V`.
    E.  The determinant of any associated matrix representation.
    ans: C

129. The translation of abstract linear algebra problems into the language of matrices is powerful mainly because:
    A.  Matrices are conceptually simpler objects than abstract vector spaces for all purposes.
    B.  Matrix operations (like multiplication, inversion, row reduction) are concrete, algorithmic, and computationally implementable.
    C.  All finite-dimensional vector spaces are identical to `F^n` in every respect.
    D.  Using matrices eliminates the need for formal proofs of linear algebra theorems.
    E.  Abstract vector spaces cannot effectively handle infinite dimensions, whereas matrices can.
    ans: B

130. The definition of a basis for a vector space `V` ensures that every vector in `V` can be written uniquely as a linear combination of the basis vectors. This uniqueness is key for:
    A.  Ensuring `V` is finite-dimensional.
    B.  The well-definedness and invertibility of the isomorphism `\rho_B: F^n \to V`.
    C.  The commutativity of vector addition.
    D.  The existence of a zero vector in `V`.
    E.  The closure of `V` under scalar multiplication.
    ans: B

131. The lecture mentions that for general vector spaces (possibly infinite-dimensional), proving the existence of a basis requires more advanced set theory, including:
    A.  The Peano Axioms for natural numbers.
    B.  The Axiom of Choice.
    C.  Cantor's diagonalization argument for uncountability.
    D.  The Principle of Mathematical Induction.
    E.  The Completeness Axiom specific to real numbers.
    ans: B

132. While many results in the lecture apply broadly, a caution is given regarding vector spaces over finite fields, stating that they:
    A.  Behave identically to vector spaces over `\mathbb{R}` in all aspects of linear algebra.
    B.  Can exhibit "weird properties," particularly when dealing with sums of finite sets of vectors.
    C.  Do not allow for the concept of linear independence.
    D.  Cannot be used to define linear transformations.
    E.  Are always trivial or one-dimensional.
    ans: B