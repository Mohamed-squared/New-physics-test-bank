### Chapter 1: Matrix Operations (Based on Lecture)

1.  The set of all $n \times n$ matrices with real entries is denoted as:
    A.  $GL_n(\mathbb{R})$
    B.  $M_n(\mathbb{R})$
    C.  $S_n$
    D.  $\mathbb{R}^n$
    E.  $O_n$
    ans: B

2.  Matrix addition $A+B$ for matrices $A=[a_{ij}]$ and $B=[b_{ij}]$ is defined by the resulting matrix $C=[c_{ij}]$ where:
    A.  $c_{ij} = a_{ij} b_{ij}$
    B.  $c_{ij} = a_{ij} + b_{ij}$
    C.  $c_{ij} = \sum_k a_{ik} b_{kj}$
    D.  $c_{ij} = a_{ij} - b_{ij}$
    E.  $c_{ij} = a_{ji} + b_{ji}$
    ans: B

3.  Scalar multiplication $\alpha A$ for a real scalar $\alpha$ and matrix $A=[a_{ij}]$ is defined by the resulting matrix $C=[c_{ij}]$ where:
    A.  $c_{ij} = \alpha + a_{ij}$
    B.  $c_{ij} = \alpha / a_{ij}$
    C.  $c_{ij} = \alpha^{a_{ij}}$
    D.  $c_{ij} = \alpha a_{ij}$
    E.  $c_{ij} = a_{ij}$ if $i=j$, $0$ otherwise
    ans: D

4.  The dimension of the real vector space $M_n(\mathbb{R})$ is:
    A.  $n$
    B.  $2n$
    C.  $n^2$
    D.  $n!$
    E.  $n^n$
    ans: C

5.  Matrix multiplication $C = AB$ for $n \times n$ matrices $A=[a_{ij}]$ and $B=[b_{ij}]$ is defined by $c_{ij} = $:
    A.  $a_{ij} b_{ij}$
    B.  $a_{ij} + b_{ij}$
    C.  $\sum_{k=1}^n a_{ik} b_{kj}$
    D.  $\sum_{k=1}^n a_{ki} b_{jk}$
    E.  $\det(A) \det(B)$
    ans: C

6.  Matrix multiplication corresponds to which operation on linear transformations?
    A.  Addition of transformations
    B.  Scalar multiplication of transformations
    C.  Composition of transformations
    D.  Inversion of transformations
    E.  Taking the determinant of transformations
    ans: C

7.  Which fundamental property does matrix multiplication LACK in general?
    A.  Associativity ($A(BC) = (AB)C$)
    B.  Existence of an identity element
    C.  Distributivity over addition ($A(B+C) = AB+AC$)
    D.  Commutativity ($AB = BA$)
    E.  Closure (product of two $n \times n$ matrices is an $n \times n$ matrix)
    ans: D

8.  The identity matrix $I$ is an $n \times n$ matrix with:
    A.  All entries equal to 1.
    B.  1s on the main diagonal and 0s elsewhere.
    C.  0s on the main diagonal and 1s elsewhere.
    D.  Alternating 1s and 0s.
    E.  All entries equal to 0.
    ans: B

9.  What is the property of the identity matrix $I$?
    A.  $A+I = A$ for any matrix A.
    B.  $AI = IA = A$ for any matrix A.
    C.  $AI = 0$ for any matrix A.
    D.  $\det(I) = 0$.
    E.  $I^{-1}$ does not exist.
    ans: B

10. The associative law of matrix multiplication states that:
    A.  $AB = BA$
    B.  $A(B+C) = AB+AC$
    C.  $(AB)C = A(BC)$
    D.  $A+B = B+A$
    E.  $c(AB) = (cA)B$
    ans: C

11. An $n \times n$ matrix $A$ is called invertible if:
    A.  $\det(A) = 0$
    B.  There exists a matrix $B$ such that $AB = I$.
    C.  There exists a matrix $B$ such that $BA = I$.
    D.  There exists a matrix $B$ such that $AB = BA = I$.
    E.  $A$ has a row of zeros.
    ans: D

12. For $1 \times 1$ matrices (real numbers), a matrix $[a]$ is invertible if and only if:
    A.  $a = 1$
    B.  $a = -1$
    C.  $a = 0$
    D.  $a \neq 0$
    E.  $a > 0$
    ans: D

13. For a $2 \times 2$ matrix $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$, it is invertible if and only if:
    A.  $a+d \neq 0$
    B.  $a, b, c, d$ are all non-zero
    C.  $ad - bc \neq 0$
    D.  $ac - bd \neq 0$
    E.  $a=d$ and $b=c$
    ans: C

14. If $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$ is invertible, its inverse $A^{-1}$ is given by:
    A.  $\frac{1}{ad-bc} \begin{pmatrix} a & b \\ c & d \end{pmatrix}$
    B.  $\frac{1}{ad-bc} \begin{pmatrix} d & b \\ c & a \end{pmatrix}$
    C.  $\frac{1}{ad-bc} \begin{pmatrix} a & -c \\ -b & d \end{pmatrix}$
    D.  $\frac{1}{ad-bc} \begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$
    E.  $\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$
    ans: D

15. The determinant function maps $M_n(\mathbb{R})$ to:
    A.  $M_n(\mathbb{R})$
    B.  $\mathbb{R}^n$
    C.  $\mathbb{R}$
    D.  $GL_n(\mathbb{R})$
    E.  The set $\{0, 1\}$
    ans: C

16. An $n \times n$ matrix $A$ is invertible if and only if:
    A.  $\det(A) = 1$
    B.  $\det(A) = 0$
    C.  $\det(A) \neq 0$
    D.  $A$ is symmetric
    E.  $A$ is the identity matrix
    ans: C

17. The matrix implicitly computed in the lecture that multiplies $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$ to give $\det(A)I$ is:
    A.  $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$
    B.  $\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$
    C.  $\begin{pmatrix} a & -c \\ -b & d \end{pmatrix}$
    D.  $\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$
    E.  $\begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$
    ans: B

18. The set $GL_n(\mathbb{R})$ is defined as:
    A.  All $n \times n$ matrices with real entries.
    B.  All symmetric $n \times n$ matrices with real entries.
    C.  All $n \times n$ matrices $A$ such that $\det(A) \neq 0$.
    D.  All $n \times n$ matrices $A$ such that $\det(A) = 1$.
    E.  All upper triangular $n \times n$ matrices.
    ans: C

19. If a matrix $A$ is invertible, is its inverse $A^{-1}$ unique?
    A.  Yes, always.
    B.  No, there can be multiple inverses.
    C.  Only if A is diagonal.
    D.  Only if A is the identity matrix.
    E.  Only if $\det(A)=1$.
    ans: A

20. Which operation is generally NOT defined or closed within the set $GL_n(\mathbb{R})$?
    A.  Matrix multiplication
    B.  Taking the inverse
    C.  Matrix addition
    D.  Multiplying by a non-zero scalar
    E.  Existence of the identity matrix
    ans: C

21. If $A$ and $B$ are in $GL_n(\mathbb{R})$, is their product $AB$ also in $GL_n(\mathbb{R})$?
    A.  Yes, always.
    B.  No, not necessarily.
    C.  Only if $A=B$.
    D.  Only if $AB=BA$.
    E.  Only if $n=1$.
    ans: A

22. If $A, B \in GL_n(\mathbb{R})$, what is the inverse of their product, $(AB)^{-1}$?
    A.  $A^{-1}B^{-1}$
    B.  $B^{-1}A^{-1}$
    C.  $(BA)^{-1}$
    D.  $AB$
    E.  $I$
    ans: B

23. What fundamental property of determinants is used to show that if $A, B \in GL_n(\mathbb{R})$, then $AB \in GL_n(\mathbb{R})$?
    A.  $\det(A^t) = \det(A)$
    B.  $\det(cA) = c^n \det(A)$
    C.  $\det(I) = 1$
    D.  $\det(AB) = \det(A)\det(B)$
    E.  $\det(A^{-1}) = 1/\det(A)$
    ans: D

24. A set $G$ with a product operation is called a group if it satisfies which properties?
    A.  Commutativity, Associativity, Identity, Inverses
    B.  Closure, Associativity, Identity, Inverses
    C.  Closure, Commutativity, Identity, Inverses
    D.  Associativity, Identity, Inverses (Closure is implied by "product operation")
    E.  Closure, Associativity, Commutativity, Identity
    ans: D

25. Which property is NOT required for a set to be a group?
    A.  The product operation must be associative.
    B.  There must exist an identity element.
    C.  Every element must have an inverse.
    D.  The product operation must be commutative.
    E.  The set must be closed under the product operation.
    ans: D

26. A group where the product operation is commutative ($gh=hg$ for all $g,h$) is called:
    A.  Cyclic
    B.  Simple
    C.  Symmetric
    D.  Abelian
    E.  General Linear
    ans: D

27. The term "Abelian" group is named after which mathematician?
    A.  Evariste Galois
    B.  Niels Abel
    C.  Mike Artin
    D.  Emil Artin
    E.  Carl Friedrich Gauss
    ans: B

28. Evariste Galois is known for foundational work in group theory and which other area mentioned in the lecture?
    A.  Class field theory
    B.  Topology
    C.  Finite fields
    D.  Matrix calculus
    E.  Real analysis
    ans: C

29. Which mathematician died young as the result of a duel?
    A.  Niels Abel
    B.  Evariste Galois
    C.  Emil Artin
    D.  Jordan
    E.  Cauchy
    ans: B

30. The set of integers $\mathbb{Z} = \{..., -2, -1, 0, 1, 2, ...\}$ forms a group under which operation?
    A.  Multiplication
    B.  Addition
    C.  Subtraction
    D.  Division
    E.  Taking the maximum
    ans: B

31. In the group $(\mathbb{Z}, +)$, what is the identity element?
    A.  1
    B.  -1
    C.  0
    D.  There is no identity element.
    E.  Depends on the integer.
    ans: C

32. In the group $(\mathbb{Z}, +)$, what is the inverse of an element $a$?
    A.  $1/a$
    B.  $a$
    C.  $-a$
    D.  $0$
    E.  $|a|$
    ans: C

33. Is the group $(\mathbb{Z}, +)$ abelian?
    A.  Yes
    B.  No
    C.  Only for positive integers
    D.  Only for even integers
    E.  Cannot be determined
    ans: A

34. If $V$ is a vector space, does it form a group under vector addition?
    A.  Yes, always.
    B.  No, not generally.
    C.  Only if V is finite-dimensional.
    D.  Only if the scalars are real numbers.
    E.  Only if V is the zero vector space.
    ans: A

35. Let $T$ be any set. Let $G = Sym(T)$ be the set of all bijections (one-to-one and onto maps) from $T$ to itself. What is the group operation for $G$?
    A.  Addition of functions
    B.  Multiplication of function values
    C.  Composition of functions
    D.  Taking the union of the domains
    E.  Pointwise product
    ans: C

36. In the group $G = Sym(T)$, what is the identity element?
    A.  The function $f(x)=c$ for some constant c.
    B.  The function that maps every element to a single fixed element $t_0 \in T$.
    C.  The identity map $id(t) = t$ for all $t \in T$.
    D.  The empty map.
    E.  A map selected arbitrarily.
    ans: C

37. In the group $G = Sym(T)$, what is the inverse of an element $g \in G$?
    A.  The function $-g$.
    B.  The function $1/g$.
    C.  The inverse function $g^{-1}$.
    D.  The composition $g \circ g$.
    E.  The identity map.
    ans: C

38. The symmetric group $S_n$ is defined as the group of bijections of which set?
    A.  $\mathbb{R}^n$
    B.  $\mathbb{Z}$
    C.  $GL_n(\mathbb{R})$
    D.  The set $\{1, 2, ..., n\}$
    E.  Any set with $n!$ elements
    ans: D

39. What is the order (number of elements) of the symmetric group $S_n$?
    A.  $n$
    B.  $n^2$
    C.  $2^n$
    D.  $n!$
    E.  It is infinite.
    ans: D

40. For which values of $n$ is the symmetric group $S_n$ non-abelian?
    A.  $n \ge 1$
    B.  $n \ge 2$
    C.  $n \ge 3$
    D.  Only for even $n$
    E.  Only for prime $n$
    ans: C

41. The group $GL_n(\mathbb{R})$ can be thought of as the group of symmetries of $\mathbb{R}^n$ that preserve which structure?
    A.  The distance between points
    B.  The origin only
    C.  The vector space structure (linearity)
    D.  The order of coordinates
    E.  The sign of the coordinates
    ans: C

42. Mike Artin, author of the textbook, is described as a leading figure in algebra and which other field?
    A.  Number Theory
    B.  Topology
    C.  Mathematical Physics
    D.  Algebraic Geometry
    E.  Differential Equations
    ans: D

43. Emil Artin, Mike Artin's father, is described as the greatest figure of the 20th century in which field?
    A.  Algebraic Geometry
    B.  Group Theory
    C.  Number Theory (specifically Class Field Theory)
    D.  Analysis
    E.  Logic
    ans: C

44. The lecture emphasizes that learning algebra is akin to:
    A.  Learning to compute determinants quickly.
    B.  Learning a new language.
    C.  Mastering calculus techniques.
    D.  Understanding geometric shapes.
    E.  Solving differential equations.
    ans: B

45. Which matrix property ensures that matrix multiplication is well-defined for any pair of $n \times n$ matrices A and B?
    A. Associativity
    B. Commutativity
    C. Closure
    D. Existence of Identity
    E. Existence of Inverses
    ans: C