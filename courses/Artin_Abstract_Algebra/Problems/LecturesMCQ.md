### Chapter 1: Lec 1

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

### Chapter 1: Lec 2

1.  The General Linear Group $GL_n(\mathbb{R})$ consists of:
    A.  All $n \times n$ matrices with real entries.
    B.  All invertible $n \times n$ matrices with real entries.
    C.  All symmetric $n \times n$ matrices with real entries.
    D.  All $n \times n$ matrices with integer entries.
    E.  All permutations of $n$ elements.
    ans: B

2.  Which operation forms the group operation for $GL_n(\mathbb{R})$?
    A.  Matrix Addition
    B.  Matrix Multiplication
    C.  Scalar Multiplication
    D.  Taking the Determinant
    E.  Taking the Transpose
    ans: B

3.  What is the identity element in the group $GL_n(\mathbb{R})$?
    A.  The zero matrix $0$.
    B.  The matrix with all entries equal to 1.
    C.  The identity matrix $I$.
    D.  Any diagonal matrix.
    E.  There is no single identity element.
    ans: C

4.  For a set $G$ with an operation $*$ to be a group, which property must hold for all $a, b, c \in G$?
    A.  $a * b = b * a$ (Commutativity)
    B.  $(a * b) * c = a * (b * c)$ (Associativity)
    C.  $a * a = a$ (Idempotence)
    D.  There exists $e$ such that $a * e = a$. (Right Identity only)
    E.  For every $a$, there exists $a^{-1}$ such that $a * a^{-1} = e$. (Right Inverse only)
    ans: B

5.  Which of the following is NOT a required property for a set $G$ with operation $*$ to be a group?
    A.  Closure: For all $a, b \in G$, $a * b \in G$.
    B.  Associativity: For all $a, b, c \in G$, $(a * b) * c = a * (b * c)$.
    C.  Identity Element: There exists $e \in G$ such that for all $a \in G$, $a * e = e * a = a$.
    D.  Inverse Element: For each $a \in G$, there exists $a^{-1} \in G$ such that $a * a^{-1} = a^{-1} * a = e$.
    E.  Commutativity: For all $a, b \in G$, $a * b = b * a$.
    ans: E

6.  The group $GL_n(\mathbb{R})$ satisfies all the group axioms because matrix multiplication is associative, the identity matrix $I$ serves as the identity element, every matrix $A \in GL_n(\mathbb{R})$ has an inverse $A^{-1} \in GL_n(\mathbb{R})$, and:
    A.  Matrix multiplication is commutative.
    B.  The product of two invertible matrices is invertible ($\det(AB) = \det(A)\det(B) \neq 0$).
    C.  The sum of two invertible matrices is invertible.
    D.  All matrices in $GL_n(\mathbb{R})$ are symmetric.
    E.  The determinant of any matrix in $GL_n(\mathbb{R})$ is 1.
    ans: B

7.  Why is the set of ALL $n \times n$ matrices $M_n(\mathbb{R})$ NOT a group under matrix multiplication?
    A.  Matrix multiplication is not associative.
    B.  There is no identity matrix.
    C.  Not all matrices have multiplicative inverses (e.g., the zero matrix).
    D.  The set is not closed under multiplication.
    E.  Matrix multiplication is not commutative.
    ans: C

8.  The definition of matrix multiplication $C=AB$ where $A=[a_{ik}]$ and $B=[b_{kj}]$ is:
    A.  $c_{ij} = a_{ij} + b_{ij}$
    B.  $c_{ij} = \sum_k a_{ik} b_{kj}$
    C.  $c_{ij} = a_{ij} b_{ij}$
    D.  $c_{ij} = \sum_k a_{ki} b_{jk}$
    E.  $c_{ij} = \det(A) b_{ij}$
    ans: B

9.  Is the group $GL_n(\mathbb{R})$ generally Abelian (commutative)?
    A.  Yes, for all $n$.
    B.  Yes, for $n=1$ only.
    C.  Yes, for $n=1$ and $n=2$.
    D.  No, only if $n=1$. It is generally non-abelian for $n \ge 2$.
    E.  No, it is never abelian.
    ans: D

10. The group $GL_n(\mathbb{C})$ consists of:
    A.  Invertible $n \times n$ matrices with real entries.
    B.  Invertible $n \times n$ matrices with integer entries.
    C.  Invertible $n \times n$ matrices with rational entries.
    D.  Invertible $n \times n$ matrices with complex entries.
    E.  All $n \times n$ matrices with complex entries.
    ans: D

11. The group $GL_n(\mathbb{Q})$ consists of:
    A.  Invertible $n \times n$ matrices with real entries.
    B.  Invertible $n \times n$ matrices with integer entries.
    C.  Invertible $n \times n$ matrices with rational entries.
    D.  Invertible $n \times n$ matrices with complex entries.
    E.  All $n \times n$ matrices with rational entries.
    ans: C

12. The set of integers $\mathbb{Z} = \{..., -1, 0, 1, ...\}$ forms a group under which operation?
    A.  Multiplication
    B.  Subtraction
    C.  Division
    D.  Addition
    E.  Exponentiation
    ans: D

13. What is the identity element in the group $(\mathbb{Z}, +)$?
    A.  1
    B.  -1
    C.  0
    D.  There is no identity.
    E.  It depends on the integer.
    ans: C

14. Is the group $(\mathbb{Z}, +)$ Abelian?
    A.  Yes
    B.  No
    C.  Only for positive integers
    D.  Only for even integers
    E.  Sometimes
    ans: A

15. Any vector space $V$ forms an Abelian group under which operation?
    A.  Scalar Multiplication
    B.  Dot Product
    C.  Cross Product
    D.  Vector Addition
    E.  Matrix Multiplication
    ans: D

16. Let $T$ be any set. The set $Sym(T)$ consists of:
    A.  All functions from $T$ to $T$.
    B.  All injective (one-to-one) functions from $T$ to $T$.
    C.  All surjective (onto) functions from $T$ to $T$.
    D.  All bijective (one-to-one and onto) functions from $T$ to $T$.
    E.  All subsets of $T$.
    ans: D

17. What is the group operation in $Sym(T)$?
    A.  Function addition
    B.  Pointwise multiplication
    C.  Composition of functions
    D.  Set union
    E.  Set intersection
    ans: C

18. What is the identity element in $Sym(T)$?
    A.  The constant function $f(t) = t_0$ for some $t_0 \in T$.
    B.  The zero function (if applicable).
    C.  The identity map $id(t) = t$.
    D.  The empty function.
    E.  There might not be one.
    ans: C

19. If $f \in Sym(T)$, what is its inverse element $f^{-1}$ in the group?
    A.  The function $1/f$.
    B.  The function $-f$.
    C.  The inverse function (which exists because $f$ is bijective).
    D.  The identity map.
    E.  The function $f$ itself.
    ans: C

20. In the context of the lecture, the term "automorphism" of a set $T$ is used synonymously with:
    A.  Any function $T \to T$.
    B.  An injective function $T \to T$.
    C.  A surjective function $T \to T$.
    D.  A bijective function $T \to T$.
    E.  A homomorphism $T \to T$.
    ans: D

21. The Symmetric Group $S_n$ is defined as:
    A.  $Sym(\mathbb{R}^n)$
    B.  $Sym(\mathbb{Z})$
    C.  $Sym(\{1, 2, ..., n\})$
    D.  $GL_n(\mathbb{R})$
    E.  The set of all $n \times n$ symmetric matrices.
    ans: C

22. An element of the Symmetric Group $S_n$ is called a:
    A.  Matrix
    B.  Vector
    C.  Permutation
    D.  Cycle
    E.  Transposition
    ans: C

23. What is the order (number of elements) of the group $S_n$?
    A.  $n$
    B.  $n^2$
    C.  $2n$
    D.  $n!$
    E.  Infinite
    ans: D

24. For which values of $n$ is the Symmetric Group $S_n$ Abelian?
    A.  $n=1$ only
    B.  $n=2$ only
    C.  $n=1$ and $n=2$
    D.  $n \ge 3$
    E.  All $n$
    ans: C

25. $GL_n(\mathbb{R})$ is a subgroup of $Sym(\mathbb{R}^n)$ consisting of the bijections that preserve:
    A.  Distances
    B.  Angles
    C.  The origin
    D.  The linear (vector space) structure
    E.  The coordinate axes
    ans: D

26. A subset $H$ of a group $G$ is a subgroup if:
    A.  $H$ is non-empty.
    B.  $H$ is closed under the group operation of $G$.
    C.  $H$ contains the identity element of $G$.
    D.  For every $h \in H$, its inverse $h^{-1}$ (from $G$) is also in $H$.
    E.  All of the above (B, C, and D imply A).
    ans: E

27. Which of the following conditions is sufficient to show a non-empty subset $H$ of a group $G$ is a subgroup?
    A.  For all $a, b \in H$, $a b \in H$.
    B.  For all $a \in H$, $a^{-1} \in H$.
    C.  For all $a, b \in H$, $a b^{-1} \in H$.
    D.  $H$ contains the identity element $e$.
    E.  $H$ is finite.
    ans: C

28. Every group $G$ has at least two subgroups (unless $G=\{e\}$). What are these "trivial" subgroups?
    A.  The center $Z(G)$ and the commutator subgroup $[G,G]$.
    B.  The subgroup containing only the identity $\{e\}$ and the group $G$ itself.
    C.  The set of elements of finite order and the set of elements of infinite order.
    D.  The set of invertible elements and the set of non-invertible elements.
    E.  Abelian subgroups and non-abelian subgroups.
    ans: B

29. The group $S_1 = Sym(\{1\})$ contains how many elements?
    A.  0
    B.  1 (the identity)
    C.  2
    D.  $1! = 1$
    E.  Both B and D are correct.
    ans: E

30. The group $S_2 = Sym(\{1, 2\})$ has order $2! = 2$. Its elements are the identity $e$ and the transposition $\tau = (1 2)$. What is $\tau^2$?
    A.  $\tau$
    B.  $e$
    C.  A different element
    D.  Undefined
    E.  Depends on the representation.
    ans: B

31. Based on its multiplication table ($e*e=e, e*\tau=\tau, \tau*e=\tau, \tau*\tau=e$), the group $S_2$ is:
    A.  Non-abelian
    B.  Cyclic
    C.  Abelian
    D.  Infinite
    E.  Both B and C are correct.
    ans: E

32. How many elements does the group $S_3 = Sym(\{1, 2, 3\})$ have?
    A.  3
    B.  6
    C.  8
    D.  9
    E.  $3^2=9$
    ans: B

33. Which of the following is NOT an element of $S_3$? (Using cycle notation)
    A.  $e$ (identity)
    B.  $(1 2)$
    C.  $(1 3)$
    D.  $(2 3)$
    E.  $(1 2 3 4)$
    ans: E

34. Let $\tau = (1 2)$ and $\sigma = (1 2 3)$ in $S_3$. The lecture computed $\tau\sigma$ (apply $\sigma$ then $\tau$) and found it sends $1 \to 1$, $2 \to 3$, $3 \to 2$. Which element is $\tau\sigma$?
    A.  $e$
    B.  $(1 2)$
    C.  $(1 3)$
    D.  $(2 3)$
    E.  $(1 2 3)$
    ans: D

35. Let $\tau = (1 2)$ and $\sigma = (1 2 3)$ in $S_3$. The lecture computed $\sigma\tau$ (apply $\tau$ then $\sigma$) and found it sends $1 \to 3$, $2 \to 2$, $3 \to 1$. Which element is $\sigma\tau$?
    A.  $e$
    B.  $(1 2)$
    C.  $(1 3)$
    D.  $(2 3)$
    E.  $(1 3 2)$
    ans: C

36. A permutation that exchanges exactly two elements and leaves all others fixed is called a:
    A.  Cycle
    B.  Rotation
    C.  Reflection
    D.  Transposition
    E.  Identity
    ans: D

37. If $\tau$ is a transposition in $S_n$, what is $\tau^2$?
    A.  $\tau$
    B.  $e$ (the identity)
    C.  $\tau^{-1}$ (which equals $\tau$)
    D.  Another transposition
    E.  Both B and C are correct.
    ans: E

38. The set $b\mathbb{Z} = \{ b k \mid k \in \mathbb{Z} \}$ consists of all integer multiples of $b$. This set forms a subgroup of $(\mathbb{Z}, +)$ because:
    A.  It contains 0 ($b \times 0$).
    B.  The sum of two multiples of $b$ is a multiple of $b$ ($bm + bn = b(m+n)$).
    C.  The additive inverse of a multiple of $b$ is a multiple of $b$ ($-(bm) = b(-m)$).
    D.  All of the above.
    E.  It is finite.
    ans: D

39. A key theorem states that every subgroup of the additive group of integers $(\mathbb{Z}, +)$ is of the form:
    A.  $\{0, 1, ..., n\}$ for some $n$.
    B.  $\{ k \in \mathbb{Z} \mid k \text{ is prime} \}$.
    C.  $\{ k \in \mathbb{Z} \mid k \text{ is even} \}$.
    D.  $b\mathbb{Z}$ for some integer $b \ge 0$.
    E.  $\{ k \in \mathbb{Z} \mid k \ge 0 \}$.
    ans: D

40. The proof that every subgroup $H$ of $(\mathbb{Z}, +)$ is $b\mathbb{Z}$ relies on considering $b$ to be:
    A.  The largest element in $H$.
    B.  Any element in $H$.
    C.  The smallest positive element in $H$ (if $H \neq \{0\}$).
    D.  An element not in $H$.
    E.  The identity element 0.
    ans: C

41. How can $S_k$ (for $k < n$) be viewed as a subgroup of $S_n$?
    A.  By considering only permutations that move elements $1, ..., k$.
    B.  By considering permutations in $S_n$ that fix the elements $k+1, k+2, ..., n$.
    C.  By adding the identity element $n-k$ times.
    D.  By taking the first $k$ elements of each permutation in $S_n$.
    E.  It cannot be viewed as a subgroup.
    ans: B

42. Consider the subgroup of $GL_2(\mathbb{R})$ consisting of matrices that stabilize the line $y=0$ (the x-axis). A matrix $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ is in this subgroup if and only if:
    A.  $a=0$
    B.  $b=0$
    C.  $c=0$
    D.  $d=0$
    E.  $a=d=1$
    ans: C (Correction: The lecture derived b=0. Let's recheck the transcript. Hmm, the transcript is confusing. 34:05 "What does it mean that it fixes the first basis vector? It means that the entry B in the matrix is zero." This refers to $A(1,0) = (a,c)$. For this to be a multiple of $(1,0)$, $c$ must be 0. Let's assume the lecturer misspoke/miswrote B for C.)
    ans: C

43. The set of matrices of the form $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix}$ with $ad \neq 0$ forms a subgroup of $GL_2(\mathbb{R})$ because the product $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix} \begin{pmatrix} a' & 0 \\ c' & d' \end{pmatrix}$ is:
    A.  $\begin{pmatrix} aa' & 0 \\ cc' & dd' \end{pmatrix}$
    B.  $\begin{pmatrix} aa' & 0 \\ ca'+dc' & dd' \end{pmatrix}$
    C.  $\begin{pmatrix} aa' & ac'+cd' \\ 0 & dd' \end{pmatrix}$
    D.  $\begin{pmatrix} aa' & bb' \\ cc' & dd' \end{pmatrix}$
    E.  The identity matrix.
    ans: B (Assuming c=0 was the condition from Q42. Rechecking transcript 35:04 "We better check that if we multiply two matrices that look like this [a b; c d] ... oh, [a 0; c d]... no wait, the lecture derived b=0 at 34:09, contradicting the derivation for fixing (1,0) needing c=0 at 34:06. Let's go with the $b=0$ derivation as stated later in the text 34:38 "So a matrix will fix this line if and only if the B entry is zero" and "AD is not equal to 0". Product: $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix} \begin{pmatrix} a' & 0 \\ c' & d' \end{pmatrix} = \begin{pmatrix} aa' & 0 \\ ca'+dc' & dd' \end{pmatrix}$. This form does NOT have $b=0$. Let's assume the condition was $c=0$. Product: $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix} \begin{pmatrix} a' & b' \\ 0 & d' \end{pmatrix} = \begin{pmatrix} aa' & ab'+bd' \\ 0 & dd' \end{pmatrix}$. This IS closed. Okay, the question must assume the condition for fixing $y=0$ requires $c=0$.)
    ans: B (Based on calculation assuming $c=0$ form)

44. The subgroup of $GL_2(\mathbb{R})$ consisting of matrices $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}$ (upper triangular) corresponds to linear transformations that stabilize (map to itself) which line?
    A.  The y-axis ($x=0$)
    B.  The x-axis ($y=0$)
    C.  The line $y=x$
    D.  The line $y=-x$
    E.  The origin only
    ans: B

45. For an element $g$ in a group $G$, the cyclic subgroup generated by $g$, denoted $\langle g \rangle$, is:
    A.  The set $\{e, g\}$.
    B.  The set of all elements $x$ such that $xg = gx$.
    C.  The set of all integer powers of $g$, $\{ g^k \mid k \in \mathbb{Z} \}$.
    D.  The set $\{g, g^{-1}\}$.
    E.  The group $G$ itself.
    ans: C

46. The cyclic subgroup $\langle g \rangle = \{ g^k \mid k \in \mathbb{Z} \}$ is always:
    A.  Non-abelian
    B.  Finite
    C.  Infinite
    D.  Abelian
    E.  The trivial group $\{e\}$.
    ans: D

47. The order of an element $g$ in a group $G$ is:
    A.  The number of elements in the group $G$.
    B.  The smallest positive integer $m$ such that $g^m = g$.
    C.  The smallest positive integer $m$ such that $g^m = e$ (the identity), if such an $m$ exists.
    D.  The number of distinct powers $g^k$.
    E.  Infinite, always.
    ans: C

48. If no positive integer $m$ exists such that $g^m = e$, the element $g$ is said to have:
    A.  Order 0
    B.  Order 1
    C.  Prime order
    D.  Infinite order
    E.  Undefined order
    ans: D

49. In the group $S_3$, what is the order of the transposition $\tau = (1 2)$?
    A.  1
    B.  2 (since $\tau^2 = e$)
    C.  3
    D.  6
    E.  Infinite
    ans: B

50. In the group $S_3$, what is the order of the 3-cycle $\sigma = (1 2 3)$?
    A.  1
    B.  2
    C.  3 (since $\sigma^2 = (1 3 2)$ and $\sigma^3 = e$)
    D.  6
    E.  Infinite
    ans: C

51. A major theorem (Lagrange's Theorem, hinted at) states that in a finite group $G$, the order of any element $g$:
    A.  Must be equal to the order of the group $|G|$.
    B.  Must divide the order of the group $|G|$.
    C.  Must be prime.
    D.  Must be less than the order of the group $|G|$.
    E.  Can be any integer.
    ans: B

52. The mathematician Niels Abel, after whom Abelian groups are named, made significant contributions before dying young from:
    A.  A duel
    B.  Tuberculosis
    C.  A political execution
    D.  Starvation
    E.  Old age
    ans: B (The lecture mentions Galois died in a duel, implicitly contrasting with Abel)

53. Evariste Galois laid foundations for group theory and finite fields before dying at age 20 from:
    A.  Tuberculosis
    B.  A duel
    C.  Smallpox
    D.  Yellow fever
    E.  A carriage accident
    ans: B

54. The lecture compares learning algebra, especially group theory with its definitions and structures, to:
    A.  Memorizing formulas
    B.  Learning a programming language
    C.  Learning a natural language
    D.  Solving puzzles
    E.  Building with blocks
    ans: C