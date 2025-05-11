# Chapter 1: Lec_1

1.  The lecturer, Professor Gross, mentioned that the Teaching Assistant (TA) for the course, Peter Green, will substitute for him on certain occasions. Approximately how often is Peter expected to lecture, and what prior experience with this course does Peter have, according to the professor?

2.  What is the title and author of the primary textbook recommended for this algebra course? Briefly discuss the author's affiliation and any relevant family connections to mathematics that were mentioned in the lecture.

3.  Professor Gross outlined a recommended mathematical background for students intending to take this algebra course. What previous math courses or concepts did he suggest would provide adequate preparation, and what specific area of linear algebra did he emphasize as being important?

4.  The set of all n x n matrices with real entries is denoted by M_n(R). Explain why this set, equipped with standard matrix addition and scalar multiplication, forms a real vector space. What is the dimension of this vector space, and provide a brief justification for this dimension.

5.  Given the 2x2 matrices A = $\begin{pmatrix} 1 & 2 \\ 3 & 0 \end{pmatrix}$ and B = $\begin{pmatrix} -1 & 1 \\ 2 & 4 \end{pmatrix}$.
    Calculate:
    (i) A + B
    (ii) 3A
    (iii) AB
    (iv) BA
    Is matrix multiplication commutative for these specific matrices?

6.  Write down the general formula for the (i,j)-th entry of the product C = AB, where A and B are n x n matrices. Explain what each part of the formula represents in terms of rows and columns.

7.  Professor Gross stated that matrix multiplication is associative, i.e., (AB)C = A(BC). While a full proof was not given, he mentioned that this property can be understood more intuitively by considering matrices as representations of what kind of mathematical objects, and matrix multiplication as what kind of operation on these objects?

8.  Define the n x n identity matrix, denoted as I (or I_n). What is the result of multiplying any n x n matrix A by the identity matrix I (i.e., AI and IA)?

9.  A square matrix A is said to be invertible if there exists a matrix B such that AB = BA = I, where I is the identity matrix. Prove that if such an inverse matrix B exists, it must be unique. (This unique inverse is denoted A⁻¹).

10. State the fundamental condition, in terms of its determinant, for an n x n matrix A to be invertible.

11. Consider the 2x2 matrix A = $\begin{pmatrix} 4 & 7 \\ 2 & 3 \end{pmatrix}$.
    (i) Calculate det(A).
    (ii) Determine if A is invertible.
    (iii) If A is invertible, find its inverse A⁻¹ using the formula for 2x2 matrices.

12. If A and B are invertible n x n matrices, prove that their product AB is also invertible and that (AB)⁻¹ = B⁻¹A⁻¹.

13. Provide an example of two invertible 2x2 matrices A and B such that their sum (A+B) is *not* invertible. (Hint: Think about what makes a matrix non-invertible).

14. The lecture discussed the properties of matrix multiplication. Give an example of two 2x2 matrices, M and N, such that M·N ≠ N·M, and where one of these products results in the zero matrix while the other does not. (The lecturer used the example matrices [[0,1],[0,0]] and [[0,0],[0,1]] or similar).

15. Define a group. List the four fundamental axioms (or properties) that a set G equipped with a binary operation (let's call it *) must satisfy for (G, *) to be a group.

16. What does it mean for a group to be "Abelian" or "commutative"? Provide one example of an Abelian group and one example of a non-Abelian group that were discussed in the lecture.

17. Consider the set of integers Z = {..., -2, -1, 0, 1, 2, ...} under the operation of standard addition (+). Verify that (Z, +) forms an Abelian group by checking each of the group axioms. Clearly identify the identity element and the inverse of an arbitrary element n ∈ Z.

18. Consider the set of integers Z under the operation of standard multiplication (·). Does (Z, ·) form a group? Explain your reasoning by checking the group axioms.

19. What is the General Linear Group GL_n(R)? Define the set and state the group operation. Explain briefly why it satisfies the group axioms. Is GL_n(R) generally Abelian for n ≥ 2?

20. Professor Gross mentioned that GL_n(R) is a group under matrix multiplication but "you lose addition." Explain what this means. Specifically, why is GL_n(R) generally not closed under matrix addition? Give a simple example using 2x2 matrices.

21. Let T be any non-empty set. Define the symmetric group on T, denoted S_T or Sym(T). What are the elements of this group, and what is the group operation?

22. If T = {a, b, c} (a set with three distinct elements), the symmetric group S_T is often denoted S₃. List all the elements of S₃. (You can represent permutations using two-row notation or cycle notation). What is the order (number of elements) of S₃?

23. Demonstrate that the symmetric group S₃ is non-Abelian by providing two specific permutations σ, τ ∈ S₃ such that στ ≠ τσ. Show the compositions explicitly.

24. In the symmetric group S_n (the group of permutations of n elements):
    (i) What is the identity element?
    (ii) For a given permutation σ ∈ S_n, how is its inverse σ⁻¹ defined or found?

25. The lecture mentioned two mathematicians, Niels Henrik Abel and Evariste Galois, as foundational figures in group theory. What did the professor say about their lives and contributions, particularly regarding their early deaths and the recognition of Galois's work?

26. Consider a vector space V over the real numbers (e.g., R², R³) under the operation of vector addition. Does (V, +) form a group? If so, is it Abelian? Identify the identity element and the inverse of an arbitrary vector v ∈ V.

27. Let G be a group with identity element e. Prove that e is unique. (Hint: Assume e' is another identity element and show e = e').

28. Let G be a group and let g be an element of G. Prove that the inverse of g, denoted g⁻¹, is unique. (Hint: Assume g' and g'' are both inverses of g, and show g' = g'').

29. In any group G, prove that for any element g ∈ G, the inverse of the inverse of g is g itself, i.e., (g⁻¹)⁻¹ = g.

30. In any group G, prove the left cancellation law: if ag = ah for elements a, g, h ∈ G, then g = h. Similarly, prove the right cancellation law: if ga = ha, then g = h.

31. Consider the set {1, -1} under the operation of standard multiplication. Does this set form a group? Verify each of the group axioms.

32. Consider the set of rational numbers Q under the operation of addition. Does this form a group? Verify the axioms.

33. Consider the set of non-zero rational numbers, denoted Q* = Q \ {0}, under the operation of multiplication. Does this form a group? Verify the axioms.

34. What is the order of the symmetric group S₄ (the group of permutations of 4 elements)?

35. State the property relating the determinant of a product of two matrices to their individual determinants (i.e., det(AB) = ?). How is this property useful in showing that GL_n(R) is closed under matrix multiplication?

36. If A is an invertible matrix (A ∈ GL_n(R)), prove that its determinant cannot be zero. Then, using the property det(AB) = det(A)det(B), prove that det(A⁻¹) = 1/det(A).

37. Is the set of all n x n matrices M_n(R) under matrix multiplication a group? Explain why or why not by checking all group axioms.

38. The lecturer described algebra as being like "learning a new language." Based on the concepts introduced (matrices, groups, abstract properties), discuss two or three aspects of this algebra course that might support this analogy.

39. Explain the structure of homework assignments for this course as outlined in the lecture, distinguishing between regular and optional assignments.

40. The lecturer stated a fundamental idea, attributed to Galois, that when studying groups, one often looks at "symmetries of a set T" that "preserve some extra structure on the set." Explain how GL_n(R) fits this description. What is the set T, and what "extra structure" is being preserved by the elements of GL_n(R)?

41. Let T be a set with only two elements, say T = {α, β}. List all the elements of the symmetric group S_T (which is S₂). Is S₂ Abelian? Justify your answer.

42. Describe the relationship between the concepts "group" and "vector space" as implied by the lecture's examples. Can a vector space always be considered a group under one of its operations? Can a group always be considered a vector space?

43. Professor Gross mentioned the associative law for n x n matrices: (AB)C = A(BC). How does viewing matrices as linear transformations and matrix multiplication as composition of these transformations provide a more intuitive understanding of why this law holds, as suggested by the lecturer?

44. The definition of a group involves a set and a single binary operation. For GL_n(R), what is this operation? For the integers Z (as a group), what is this operation? For the symmetric group S_n, what is this operation?

45. The term "invertible" applies to matrices in GL_n(R) and to elements in any group. Compare and contrast the meaning of "inverse" in these two contexts. Is there a common underlying principle?