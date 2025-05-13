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