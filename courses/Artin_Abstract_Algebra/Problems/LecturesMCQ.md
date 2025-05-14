### Chapter 1

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

### Chapter 2

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
    ans: C

43. The set of matrices of the form $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix}$ with $ad \neq 0$ forms a subgroup of $GL_2(\mathbb{R})$ because the product $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix} \begin{pmatrix} a' & 0 \\ c' & d' \end{pmatrix}$ is:
    A.  $\begin{pmatrix} aa' & 0 \\ cc' & dd' \end{pmatrix}$
    B.  $\begin{pmatrix} aa' & 0 \\ ca'+dc' & dd' \end{pmatrix}$
    C.  $\begin{pmatrix} aa' & ac'+cd' \\ 0 & dd' \end{pmatrix}$
    D.  $\begin{pmatrix} aa' & bb' \\ cc' & dd' \end{pmatrix}$
    E.  The identity matrix.
    ans: B

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
    ans: B

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

55. According to the lecture's review, $GL_n(\mathbb{R})$ represents the structure-preserving bijections (automorphisms) of $\mathbb{R}^n$ that preserve:
    A.  Only the set structure of $\mathbb{R}^n$.
    B.  The linear (vector space) structure of $\mathbb{R}^n$.
    C.  The distances between points in $\mathbb{R}^n$.
    D.  The order of elements if $\mathbb{R}^n$ is viewed as a sequence.
    E.  A specific graph structure on $\mathbb{R}^n$.
    ans: B

56. The group of integers under addition, $(\mathbb{Z}, +)$, can be realized as the symmetries of which geometric object mentioned in the lecture?
    A.  A finite cycle graph $C_n$.
    B.  An $n$-dimensional cube.
    C.  An infinite directed graph with vertices in a line and arrows pointing one way.
    D.  The set of points on a circle.
    E.  A sphere.
    ans: C

57. The argument used to show that every subgroup of $(\mathbb{Z}, +)$ is of the form $b\mathbb{Z}$ (for $b \ge 0$) crucially involves:
    A.  The commutativity of addition.
    B.  The fact that $\mathbb{Z}$ is infinite.
    C.  Considering the smallest positive integer in the subgroup (if non-trivial).
    D.  The existence of prime numbers.
    E.  The well-ordering principle for negative integers.
    ans: C

58. For an element $g$ in a group $G$, the cyclic subgroup generated by $g$, denoted $\langle g \rangle$, is defined as:
    A.  $\{e, g, g^2\}$
    B.  $\{g^k \mid k \in \mathbb{Z}\}$
    C.  $\{x \in G \mid xg = gx\}$
    D.  The smallest non-abelian subgroup containing $g$.
    E.  $\{g, g^{-1}\}$
    ans: B

59. Consider the matrix $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$ in $GL_2(\mathbb{R})$. The cyclic subgroup $\langle A \rangle$ consists of matrices of the form:
    A.  $\begin{pmatrix} 1 & n \\ 0 & 1 \end{pmatrix}$ for $n \in \mathbb{Z}$
    B.  $\begin{pmatrix} n & n \\ 0 & n \end{pmatrix}$ for $n \in \mathbb{Z}$
    C.  $\begin{pmatrix} 1 & 1 \\ 0 & n \end{pmatrix}$ for $n \in \mathbb{Z}$
    D.  $\begin{pmatrix} 1 & n \\ n & 1 \end{pmatrix}$ for $n \in \mathbb{Z}$
    E.  $\{I, A\}$
    ans: A

60. What is the order of the element $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$ in $GL_2(\mathbb{R})$?
    A.  1
    B.  2
    C.  Finite, but greater than 2
    D.  Infinite
    E.  0
    ans: D

61. What is the order of the element $-I = \begin{pmatrix} -1 & 0 \\ 0 & -1 \end{pmatrix}$ in $GL_2(\mathbb{R})$?
    A.  1
    B.  2
    C.  3
    D.  4
    E.  Infinite
    ans: B

62. The intuitive idea of isomorphism between two groups $G_1$ and $G_2$ is that they:
    A.  Have the same number of elements.
    B.  Are both abelian.
    C.  Have the same multiplication table, up to a relabeling of elements.
    D.  Are both subgroups of $GL_n(\mathbb{R})$.
    E.  Are both cyclic.
    ans: C

63. Consider the group $G_1 = \{\pm 1, \pm i\}$ under complex multiplication, and $G_2 = \langle \rho \rangle \subset S_4$ where $\rho$ is the permutation $1 \to 2, 2 \to 3, 3 \to 4, 4 \to 1$. These two groups are:
    A.  Not groups.
    B.  Isomorphic.
    C.  Homomorphic but not isomorphic.
    D.  Neither homomorphic nor isomorphic.
    E.  Identical.
    ans: B

64. Let $\rho \in S_4$ be the permutation $1 \to 2, 2 \to 3, 3 \to 4, 4 \to 1$. What is $\rho^2$?
    A.  $1 \to 3, 2 \to 4, 3 \to 1, 4 \to 2$
    B.  $1 \to 2, 2 \to 3, 3 \to 4, 4 \to 1$ (i.e., $\rho$)
    C.  The identity permutation
    D.  $1 \to 4, 2 \to 1, 3 \to 2, 4 \to 3$
    E.  $1 \to 1, 2 \to 2, 3 \to 3, 4 \to 4$ (i.e., identity, but answer A is the mapping)
    ans: A

65. A map $f: G_1 \to G_2$ between two groups is an isomorphism if it is:
    A.  Only bijective.
    B.  Only preserves the group operation ($f(xy) = f(x)f(y)$).
    C.  Injective and preserves the group operation.
    D.  Surjective and preserves the group operation.
    E.  Bijective and preserves the group operation ($f(xy) = f(x)f(y)$).
    ans: E

66. The condition $f(xy) = f(x)f(y)$ for an isomorphism $f:G_1 \to G_2$ means:
    A.  Multiplication in $G_1$ is mapped to addition in $G_2$.
    B.  The order of elements is preserved.
    C.  The structure of the multiplication table is preserved under the relabeling $f$.
    D.  Both groups must be abelian.
    E.  $f$ maps the identity of $G_1$ to a generator of $G_2$.
    ans: C

67. A group $G$ is called cyclic if:
    A.  It is finite.
    B.  It is abelian.
    C.  There exists an element $g \in G$ such that $G = \langle g \rangle = \{g^k \mid k \in \mathbb{Z}\}$.
    D.  All its elements have finite order.
    E.  It is isomorphic to $(\mathbb{Z}, +)$.
    ans: C

68. A key fact stated in the lecture regarding cyclic groups is:
    A.  All finite groups are cyclic.
    B.  Any two cyclic groups are isomorphic.
    C.  Any two cyclic groups of the same finite order $n$ are isomorphic.
    D.  Cyclic groups must be subgroups of $S_n$.
    E.  Only infinite cyclic groups exist.
    ans: C

69. To construct a cyclic group of order $n$ within $S_n$, one can use the permutation:
    A.  That swaps $1$ and $2$ only.
    B.  That is the identity.
    C.  That cycles $1 \to 2, 2 \to 3, \dots, (n-1) \to n, n \to 1$.
    D.  That reverses the order of elements: $k \to n-k+1$.
    E.  That fixes all elements.
    ans: C

70. The groups $(\mathbb{R}, +)$ (real numbers under addition) and $(\mathbb{R}_{>0}, \times)$ (positive real numbers under multiplication) are isomorphic. A function witnessing this isomorphism is:
    A.  $f(x) = x^2$
    B.  $f(x) = \ln(x)$
    C.  $f(x) = e^x$
    D.  $f(x) = \sin(x)$
    E.  $f(x) = 1/x$
    ans: C

71. The isomorphism $f(x) = e^x$ from $(\mathbb{R}, +)$ to $(\mathbb{R}_{>0}, \times)$ relies on which property of exponentiation?
    A.  $e^{xy} = (e^x)^y$
    B.  $e^{x+y} = e^x e^y$
    C.  $e^0 = 1$
    D.  $\ln(e^x) = x$
    E.  $e^x > 0$ for all real $x$.
    ans: B

72. The Klein four-group, $V_4$, can be represented as a subgroup of $S_4$. One such representation involves the identity and elements like $\tau_1 = (1 2)(3 4)$ (swapping $1 \leftrightarrow 2$ and $3 \leftrightarrow 4$). What is $\tau_1^2$?
    A.  $\tau_1$
    B.  $\tau_2$ (another non-identity element)
    C.  The identity $e$
    D.  $(1 3)(2 4)$
    E.  A 4-cycle
    ans: C

73. If $\tau_1 = (1 2)(3 4)$ and $\tau_2 = (1 3)(2 4)$ are elements of the Klein four-group in $S_4$, then their product $\tau_1\tau_2$ is:
    A.  The identity $e$
    B.  $\tau_1$
    C.  $\tau_2$
    D.  $(1 4)(2 3)$
    E.  $(1 2 3 4)$
    ans: D

74. A distinguishing feature of the Klein four-group, compared to the cyclic group of order 4, is that all its non-identity elements have order:
    A.  1
    B.  2
    C.  3
    D.  4
    E.  Infinite
    ans: B

75. The Klein four-group $V_4$ and the cyclic group of order 4 ($C_4$) are:
    A.  Isomorphic because they both have 4 elements.
    B.  Isomorphic because they are both abelian.
    C.  Not isomorphic because $V_4$ has no element of order 4, while $C_4$ does.
    D.  Not isomorphic because $V_4$ is not abelian, while $C_4$ is.
    E.  Identical groups.
    ans: C

76. Which of the following is a necessary condition for two finite groups $G_1$ and $G_2$ to be isomorphic?
    A.  They must both be subgroups of $S_n$ for the same $n$.
    B.  They must have the same number of elements (same order).
    C.  They must both be non-abelian.
    D.  They must have the same set of generators.
    E.  They must have elements with the same names.
    ans: B

77. If group $G_1$ is abelian and group $G_2$ is non-abelian, can they be isomorphic?
    A.  Yes, if they have the same order.
    B.  Yes, if $G_1$ is cyclic.
    C.  No, because isomorphism preserves the property of being abelian.
    D.  Only if $G_2$ has an abelian subgroup isomorphic to $G_1$.
    E.  Only if they are both finite.
    ans: C

78. A more refined condition for two groups $G_1$ and $G_2$ to be isomorphic is that they must have the same number of elements of ________.
    A.  prime order
    B.  infinite order
    C.  order 2
    D.  every possible order
    E.  order dividing the group order
    ans: D

79. If $f: G_1 \to G_2$ is an isomorphism, then its inverse map $f^{-1}: G_2 \to G_1$:
    A.  Is not necessarily a homomorphism.
    B.  Is always a homomorphism but might not be bijective.
    C.  Is also an isomorphism.
    D.  Only exists if $G_1$ and $G_2$ are finite.
    E.  Maps everything to the identity of $G_1$.
    ans: C

80. An automorphism of a group $G$ is defined as:
    A.  Any homomorphism from $G$ to $G$.
    B.  An isomorphism from $G$ to itself.
    C.  Any bijective map from $G$ to $G$.
    D.  A homomorphism from $G$ to $\mathbb{Z}$.
    E.  A map that preserves only the identity element.
    ans: B

81. The set of all automorphisms of a group $G$, denoted $\text{Aut}(G)$, forms a group under the operation of:
    A.  Pointwise addition of functions.
    B.  Pointwise multiplication of functions.
    C.  Composition of functions.
    D.  The group operation of $G$.
    E.  Direct product.
    ans: C

82. The identity element in the group $\text{Aut}(G)$ is:
    A.  The trivial homomorphism mapping all elements to $e_G$.
    B.  The identity map $id_G: G \to G$, where $id_G(x) = x$.
    C.  An automorphism that inverts all elements of $G$.
    D.  An arbitrarily chosen automorphism.
    E.  The zero map, if $G$ is an additive group.
    ans: B

83. For $\text{Aut}(G)$ to be a group, one must verify (among other properties) that if $f \in \text{Aut}(G)$, then its inverse $f^{-1}$ is also in $\text{Aut}(G)$. This means $f^{-1}$ must be:
    A.  Only bijective.
    B.  Only a homomorphism.
    C.  A bijective homomorphism from $G$ to $G$.
    D.  The same as $f$.
    E.  The identity map.
    ans: C

84. A homomorphism $f: G_1 \to G_2$ is a map such that:
    A.  $f$ is bijective and $f(xy) = f(x)f(y)$.
    B.  $f(xy) = f(x)f(y)$ for all $x,y \in G_1$.
    C.  $f$ is injective and $f(x+y) = f(x)+f(y)$.
    D.  $f$ maps generators to generators.
    E.  $f(e_1) = e_2$ and $f(x^{-1}) = (f(x))^{-1}$. (These are properties, not the full definition)
    ans: B

85. The primary difference between an isomorphism and a homomorphism is that a homomorphism:
    A.  Need not preserve the identity element.
    B.  Need not preserve inverses.
    C.  Need not be bijective (i.e., not necessarily injective or surjective).
    D.  Applies only to abelian groups.
    E.  Requires the groups to be finite.
    ans: C

86. The determinant map $\det: GL_n(\mathbb{R}) \to \mathbb{R}^*$ (where $\mathbb{R}^*$ is non-zero reals under multiplication) is a homomorphism because:
    A.  $\det(A+B) = \det(A)+\det(B)$
    B.  $\det(AB) = \det(A)\det(B)$
    C.  $\det(I) = 1$
    D.  $\det(A^{-1}) = 1/\det(A)$
    E.  It is surjective for $n \ge 1$.
    ans: B

87. The determinant map $\det: GL_n(\mathbb{R}) \to \mathbb{R}^*$ is NOT an isomorphism for $n \ge 2$ because:
    A.  $\mathbb{R}^*$ is not a group.
    B.  $GL_n(\mathbb{R})$ is abelian while $\mathbb{R}^*$ is not.
    C.  $GL_n(\mathbb{R})$ is generally non-abelian, while $\mathbb{R}^*$ is abelian (also, it's not injective).
    D.  The determinant is always positive.
    E.  It does not preserve the identity matrix.
    ans: C

88. Given any two groups $G_1$ and $G_2$, the trivial homomorphism $f: G_1 \to G_2$ is defined by:
    A.  $f(x) = x$ for all $x \in G_1$ (only if $G_1 \subseteq G_2$).
    B.  $f(x) = e_{G_2}$ (the identity in $G_2$) for all $x \in G_1$.
    C.  $f(x) = x^{-1}$ for all $x \in G_1$.
    D.  $f(e_{G_1}) = e_{G_2}$ and $f(x)$ is undefined for $x \neq e_{G_1}$.
    E.  A map that sends generators of $G_1$ to generators of $G_2$.
    ans: B

89. The image of a homomorphism $f: G_1 \to G_2$, denoted $\text{Im}(f)$, is defined as:
    A.  The set of all elements in $G_1$ that map to the identity in $G_2$.
    B.  The set $\{y \in G_2 \mid y = f(x) \text{ for some } x \in G_1\}$.
    C.  The group $G_2$ itself, if $f$ is surjective.
    D.  The group $G_1$ itself.
    E.  The set of all isomorphisms contained within $f$.
    ans: B

90. The image of a homomorphism $f: G_1 \to G_2$ is always:
    A.  A subgroup of $G_1$.
    B.  A subgroup of $G_2$.
    C.  Isomorphic to $G_1$.
    D.  The trivial group $\{e_{G_2}\}$.
    E.  The entire group $G_2$.
    ans: B

91. If a cyclic subgroup $\langle g \rangle$ contains infinitely many distinct elements, the element $g$ is said to have:
    A.  Order 0
    B.  Order 1
    C.  Infinite order
    D.  No order
    E.  Prime order
    ans: C

92. If $G_1 = \langle x_1 \rangle$ and $G_2 = \langle x_2 \rangle$ are cyclic groups of the same finite order $n$, the map $f(x_1^k) = x_2^k$ is an isomorphism. For this map to be well-defined and bijective, it is crucial that:
    A.  $x_1$ and $x_2$ are the same element.
    B.  $G_1$ and $G_2$ are subgroups of the same larger group.
    C.  $x_1$ and $x_2$ both have order $n$.
    D.  $k$ is always positive.
    E.  The groups are written multiplicatively.
    ans: C

93. In the Klein four-group example from $S_4$, if $\tau_1 = (1 2)(3 4)$ and $\tau_3 = \tau_1 \tau_2 = (1 4)(2 3)$, what is $\tau_1 \tau_3$?
    A.  The identity $e$
    B.  $\tau_1$
    C.  $\tau_2 = (1 3)(2 4)$
    D.  $\tau_3$
    E.  A 4-cycle
    ans: C

94. Can a finite group be isomorphic to an infinite group?
    A.  Yes, if the finite group is cyclic.
    B.  Yes, if the infinite group has a finite subgroup.
    C.  No, because an isomorphism requires a bijection, so they must have the same cardinality (order).
    D.  Only if the infinite group is $(\mathbb{Z}, +)$.
    E.  Only if the finite group is the trivial group.
    ans: C

95. If $f: G \to H$ is an isomorphism and $g \in G$ has order $k$ (finite). The order of $f(g)$ in $H$ is:
    A.  Always $k$.
    B.  A divisor of $k$.
    C.  A multiple of $k$.
    D.  Potentially different from $k$.
    E.  Infinite.
    ans: A

96. The set of non-zero complex numbers, $\mathbb{C}^*$, forms a group under which operation? (This group contains $G_1 = \{\pm 1, \pm i\}$ as a subgroup).
    A.  Addition
    B.  Multiplication
    C.  Division
    D.  Composition
    E.  Exponentiation
    ans: B

97. What does it mean for two elements $a, b$ in a group $G$ to commute?
    A.  $ab = e$
    B.  $aba = b$
    C.  $ab = ba$
    D.  $a^2 = b^2$
    E.  $a$ and $b$ generate the same cyclic subgroup.
    ans: C

98. The "order of a group" $G$, denoted $|G|$, refers to:
    A.  The order of its largest cyclic subgroup.
    B.  The maximum order of any element in $G$.
    C.  The number of elements in the group $G$.
    D.  The smallest $n$ such that $G$ is a subgroup of $S_n$.
    E.  A measure of how "ordered" its multiplication table is.
    ans: C

99. A matrix representation of the Klein four-group can be formed using $2 \times 2$ diagonal matrices. Which of the following sets forms such a group under matrix multiplication?
    A.  $\{I, \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}, \begin{pmatrix} 0 & -1 \\ -1 & 0 \end{pmatrix}, -I \}$
    B.  $\{I, \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}, \begin{pmatrix} -1 & 0 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} -1 & 0 \\ 0 & -1 \end{pmatrix} \}$
    C.  $\{I, \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} 1 & -1 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix} \}$ (contains duplicates)
    D.  $\{\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} i & 0 \\ 0 & i \end{pmatrix}, \begin{pmatrix} -1 & 0 \\ 0 & -1 \end{pmatrix}, \begin{pmatrix} -i & 0 \\ 0 & -i \end{pmatrix} \}$ (this is $C_4$)
    E.  All $2 \times 2$ permutation matrices.
    ans: B

100. The General Linear Group $GL_n(\mathbb{R})$ is defined as the set of all:
    A.  $n \times n$ matrices with real entries.
    B.  Invertible $n \times n$ matrices with real entries.
    C.  $n \times n$ symmetric matrices with real entries.
    D.  $n \times n$ matrices with determinant equal to 1.
    E.  $n \times n$ matrices with rational entries.
    ans: B

101. What is the group operation for $GL_n(\mathbb{R})$?
    A.  Matrix addition
    B.  Matrix multiplication
    C.  Element-wise product
    D.  Scalar multiplication
    E.  Taking the determinant
    ans: B

102. What is the identity element in the group $GL_n(\mathbb{R})$?
    A.  The zero matrix $0_n$.
    B.  The matrix $J_n$ with all entries equal to 1.
    C.  The identity matrix $I_n$.
    D.  Any diagonal matrix with non-zero diagonal entries.
    E.  The matrix $-I_n$.
    ans: C

103. Which of the following is a key property of matrix multiplication used to establish $GL_n(\mathbb{R})$ as a group?
    A.  Commutativity ($AB=BA$)
    B.  Distributivity ($A(B+C)=AB+AC$)
    C.  Associativity ($(AB)C=A(BC)$)
    D.  Nilpotency (some power is the zero matrix)
    E.  Idempotency ($A^2=A$)
    ans: C

104. The closure property for $GL_n(\mathbb{R})$ under matrix multiplication (i.e., if $A, B \in GL_n(\mathbb{R})$, then $AB \in GL_n(\mathbb{R})$) is ensured because:
    A.  $\det(AB) = \det(A) + \det(B)$
    B.  $\det(AB) = \det(A) \det(B)$, and if $\det(A) \neq 0, \det(B) \neq 0$, then $\det(A)\det(B) \neq 0$.
    C.  The product of two symmetric matrices is symmetric.
    D.  Matrix multiplication is always defined for square matrices.
    E.  The sum of ranks is preserved.
    ans: B

105. The group $GL_n(\mathbb{C})$ consists of invertible $n \times n$ matrices with entries from:
    A.  Real numbers ($\mathbb{R}$)
    B.  Rational numbers ($\mathbb{Q}$)
    C.  Integers ($\mathbb{Z}$)
    D.  Complex numbers ($\mathbb{C}$)
    E.  Positive real numbers ($\mathbb{R}^+$)
    ans: D

106. Which of the following is NOT a required axiom for a set $G$ with an operation $*$ to be a group?
    A.  For all $a,b \in G$, $a*b \in G$ (Closure).
    B.  For all $a,b,c \in G$, $(a*b)*c = a*(b*c)$ (Associativity).
    C.  There exists an $e \in G$ such that for all $a \in G$, $a*e = e*a = a$ (Identity).
    D.  For each $a \in G$, there exists an $a^{-1} \in G$ such that $a*a^{-1} = a^{-1}*a = e$ (Inverse).
    E.  For all $a,b \in G$, $a*b = b*a$ (Commutativity).
    ans: E

107. Why is the set of all $n \times n$ real matrices, $M_n(\mathbb{R})$, not a group under matrix multiplication?
    A.  Matrix multiplication is not associative for all matrices.
    B.  The identity matrix does not exist in $M_n(\mathbb{R})$.
    C.  Not all matrices in $M_n(\mathbb{R})$ have a multiplicative inverse within $M_n(\mathbb{R})$.
    D.  The product of two $n \times n$ matrices is not always an $n \times n$ matrix.
    E.  The zero matrix acts as an identity element.
    ans: C

108. A group $G$ is called Abelian if:
    A.  It has a finite number of elements.
    B.  Every element is its own inverse.
    C.  The group operation is commutative ($ab=ba$ for all $a,b \in G$).
    D.  It has no proper non-trivial subgroups.
    E.  It is a subgroup of $GL_n(\mathbb{R})$.
    ans: C

109. For which values of $n$ is the group $GL_n(\mathbb{R})$ Abelian?
    A.  For all $n \ge 1$.
    B.  Only for $n=1$.
    C.  For $n=1$ and $n=2$.
    D.  For all $n \ge 2$.
    E.  $GL_n(\mathbb{R})$ is never Abelian.
    ans: B

110. The set of integers $\mathbb{Z} = \{..., -2, -1, 0, 1, 2, ...\}$ forms an Abelian group under which operation?
    A.  Multiplication
    B.  Addition
    C.  Subtraction
    D.  Division
    E.  Finding the maximum
    ans: B

111. What is the inverse of an element $a$ in the group $(\mathbb{Z}, +)$?
    A.  $1/a$
    B.  $a$ itself
    C.  $-a$
    D.  $0$
    E.  $|a|$
    ans: C

112. If $V$ is a vector space, it forms an Abelian group under which operation?
    A.  Scalar multiplication
    B.  Dot product
    C.  Vector addition
    D.  Cross product (for $V=\mathbb{R}^3$)
    E.  Taking the norm
    ans: C

113. The set $Sym(T)$, also known as the symmetry group of a set $T$, consists of:
    A.  All functions from $T$ to $T$.
    B.  All injective (one-to-one) functions from $T$ to $T$.
    C.  All surjective (onto) functions from $T$ to $T$.
    D.  All bijective (one-to-one and onto) functions from $T$ to $T$.
    E.  All subsets of $T$.
    ans: D

114. What is the group operation in $Sym(T)$?
    A.  Pointwise addition of functions
    B.  Composition of functions
    C.  Pointwise multiplication of functions
    D.  Set union
    E.  Set intersection
    ans: B

115. The identity element in the group $Sym(T)$ is:
    A.  The function that maps every element of $T$ to a fixed element $t_0 \in T$.
    B.  The empty function.
    C.  The identity map $id: T \to T$ defined by $id(t) = t$ for all $t \in T$.
    D.  A function $f$ such that $f(f(t))=t$.
    E.  The function that maps all elements to the smallest element in $T$ (if $T$ is ordered).
    ans: C

116. In the lecture, the term "automorphism of a set T" was used as a synonym for:
    A.  An injective map from T to T.
    B.  A surjective map from T to T.
    C.  A bijective map from T to T.
    D.  A homomorphism from T to T.
    E.  Any function from T to T that preserves some additional structure.
    ans: C

117. The lecturer referred to $Sym(T)$ as the "Ur group" because:
    A.  It was discovered in the ancient city of Ur.
    B.  It is the simplest possible group structure.
    C.  Almost all groups can be seen as arising from symmetries of some set (often with additional structure).
    D.  'Ur' is an acronym for "Universal Representation" group.
    E.  It is an uncountably infinite group for any non-empty $T$.
    ans: C

118. The Symmetric Group $S_n$ is defined as $Sym(T)$ for which specific set $T$?
    A.  $T = \mathbb{R}^n$
    B.  $T = \mathbb{Z}_n$ (integers modulo n)
    C.  $T = \{1, 2, ..., n\}$
    D.  $T = GL_n(\mathbb{R})$
    E.  $T$ is any set with $n!$ elements.
    ans: C

119. What is the order (number of elements) of the Symmetric Group $S_n$?
    A.  $n$
    B.  $n^2$
    C.  $2^n$
    D.  $n!$
    E.  It is infinite for $n > 1$.
    ans: D

120. A subset $H$ of a group $G$ is a subgroup if it satisfies which set of conditions?
    A.  $H$ is non-empty, and for all $a, b \in H$, $ab^{-1} \in H$.
    B.  $H$ is closed under the group operation of $G$, contains the identity element of $G$, and for every $h \in H$, its inverse $h^{-1}$ (as an element of $G$) is also in $H$.
    C.  $H$ is closed under the group operation and is non-empty.
    D.  $H$ contains the identity element and is closed under inverses.
    E.  $H$ is a proper subset of $G$ and is itself a group.
    ans: B

121. Which of the following are always subgroups of any group $G$?
    A.  The set of all elements of finite order.
    B.  The set $\{e\}$ (containing only the identity element) and the group $G$ itself.
    C.  The set of all elements $g$ such that $g^2=e$.
    D.  The center $Z(G) = \{z \in G \mid zg=gz \text{ for all } g \in G\}$.
    E.  Any subset of $G$ that is also a group under a different operation.
    ans: B

122. The group $S_1 = Sym(\{1\})$ has how many elements?
    A.  0
    B.  1
    C.  2
    D.  Cannot be determined
    E.  Infinitely many
    ans: B

123. The group $S_2 = Sym(\{1, 2\})$ has elements $e$ (identity) and $\tau=(12)$. What is $\tau^2$?
    A.  $e$
    B.  $\tau$
    C.  A new element not in $\{e, \tau\}$
    D.  $(21)$ which is distinct from $(12)$
    E.  Undefined
    ans: A

124. Is the group $S_2$ Abelian?
    A.  Yes, because $\tau e = e \tau = \tau$ and $\tau\tau = e$.
    B.  No, because permutations are generally not commutative.
    C.  Only if we represent permutations as matrices.
    D.  It depends on the specific elements chosen.
    E.  No, because it has order 2.
    ans: A

125. How many elements are in the Symmetric Group $S_3$?
    A.  3
    B.  4
    C.  5
    D.  6
    E.  9
    ans: D

126. In $S_3$, let $\tau = (12)$ (swaps 1 and 2, fixes 3) and $\sigma = (123)$ (sends $1 \to 2, 2 \to 3, 3 \to 1$). What is the product $\tau\sigma$ (apply $\sigma$ first, then $\tau$)?
    A.  $(13)$
    B.  $(23)$
    C.  $(123)$
    D.  $(132)$
    E.  $e$ (identity)
    ans: B

127. In $S_3$, let $\tau = (12)$ and $\sigma = (123)$. What is the product $\sigma\tau$ (apply $\tau$ first, then $\sigma$)?
    A.  $(13)$
    B.  $(23)$
    C.  $(123)$
    D.  $(132)$
    E.  $e$ (identity)
    ans: A

128. A permutation that exchanges exactly two elements and leaves all others fixed is called a:
    A.  Cycle
    B.  Bijection
    C.  Transposition
    D.  Derangement
    E.  Rotation
    ans: C

129. For which values of $n$ is the Symmetric Group $S_n$ non-Abelian?
    A.  Only for $n > 3$
    B.  For $n \ge 2$
    C.  For $n \ge 3$
    D.  Only for prime $n$
    E.  $S_n$ is always Abelian.
    ans: C

130. The lecture demonstrated that $S_n$ is non-Abelian for $n \ge 3$ by showing that:
    A.  $S_n$ contains $n!$ elements, which is too many for commutativity.
    B.  $S_3$ is non-Abelian and $S_3$ can be considered a subgroup of $S_n$ for $n \ge 3$.
    C.  All transpositions in $S_n$ fail to commute with 3-cycles.
    D.  The identity element does not commute with any other element.
    E.  $S_n$ is isomorphic to a non-Abelian matrix group.
    ans: B

131. How can $S_k$ (for $k < n$) be viewed as a subgroup of $S_n$?
    A.  By taking the first $k$ permutations from a standard listing of $S_n$.
    B.  By considering permutations in $S_n$ that map $\{1, ..., k\}$ to $\{n-k+1, ..., n\}$.
    C.  By considering permutations in $S_n$ that fix each of the elements $k+1, k+2, ..., n$.
    D.  This is not possible as their orders are different.
    E.  By padding permutations in $S_k$ with $(n-k)$ identity mappings.
    ans: C

132. According to the lecture, the subgroup of $GL_2(\mathbb{R})$ consisting of matrices $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix}$ with $ad \neq 0$ (as discussed to stabilize the x-axis, $y=0$) is closed under multiplication because the product $\begin{pmatrix} a & 0 \\ c & d \end{pmatrix} \begin{pmatrix} a' & 0 \\ c' & d' \end{pmatrix}$ is:
    A.  $\begin{pmatrix} aa' & 0 \\ cc' & dd' \end{pmatrix}$
    B.  $\begin{pmatrix} aa' & 0 \\ ca'+dc' & dd' \end{pmatrix}$
    C.  $\begin{pmatrix} a+a' & 0 \\ c+c' & d+d' \end{pmatrix}$
    D.  $\begin{pmatrix} aa' & cc' \\ 0 & dd' \end{pmatrix}$
    E.  The identity matrix, if $a=1/a', d=1/d', c=-c'$.
    ans: B

133. Mathematically, the subgroup of $GL_2(\mathbb{R})$ consisting of upper triangular matrices $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}$ with $ad \neq 0$ stabilizes which line?
    A.  The y-axis ($x=0$)
    B.  The x-axis ($y=0$)
    C.  The line $y=x$
    D.  The line $y=-x$
    E.  Only the origin $(0,0)$
    ans: B

134. A key theorem discussed in the lecture states that every subgroup of the additive group of integers $(\mathbb{Z}, +)$ is of the form:
    A.  $\{0, 1, ..., n\}$ for some $n \ge 0$.
    B.  $\{n \in \mathbb{Z} \mid n \text{ is prime or zero}\}$.
    C.  $b\mathbb{Z} = \{bk \mid k \in \mathbb{Z}\}$ for some integer $b \ge 0$.
    D.  $\{n^2 \mid n \in \mathbb{Z}\}$.
    E.  The set of Fibonacci numbers including their negatives and zero.
    ans: C

135. In the proof that any non-zero subgroup $H$ of $(\mathbb{Z}, +)$ is of the form $b\mathbb{Z}$, what is $b$?
    A.  The largest element in $H$.
    B.  The average of all elements in $H$.
    C.  The smallest positive integer in $H$.
    D.  Any non-zero element in $H$.
    E.  The greatest common divisor of all elements in $H$.
    ans: C

136. The crucial step in the proof that subgroups of $(\mathbb{Z},+)$ are $b\mathbb{Z}$ involves using the division algorithm (Euclidean algorithm). If $h \in H$ and $b$ is the smallest positive integer in $H$, we write $h = qb + r$ where $0 \le r < b$. Why must $r=0$?
    A.  Because $r = h - qb$, and since $h, qb \in H$, their difference $r$ must be in $H$. If $r > 0$, it would contradict minimality of $b$.
    B.  Because $b$ must divide $h$ by definition of a subgroup.
    C.  Because $h$ must be a multiple of $b$ for $H$ to be closed under addition.
    D.  Because $r$ is a remainder and must always be zero for integers.
    E.  Because $H$ cannot contain elements smaller than $b$.
    ans: A

137. For an element $g$ in a group $G$, the cyclic subgroup generated by $g$, denoted $\langle g \rangle$, is defined as:
    A.  $\{e, g, g^{-1}\}$
    B.  $\{g^k \mid k \in \mathbb{Z}, k \ge 0\}$ (non-negative powers)
    C.  $\{g^k \mid k \in \mathbb{Z}\}$ (all integer powers)
    D.  The set of all elements $x \in G$ such that $xg=gx$.
    E.  The smallest non-Abelian subgroup containing $g$.
    ans: C

138. The cyclic subgroup $\langle g \rangle = \{g^k \mid k \in \mathbb{Z}\}$ is always:
    A.  Finite
    B.  Infinite
    C.  Non-Abelian
    D.  Abelian
    E.  Equal to $G$ itself
    ans: D

139. The order of an element $g$ in a group $G$ is defined as:
    A.  The total number of elements in $G$.
    B.  The smallest positive integer $m$ such that $g^m = g$.
    C.  The smallest positive integer $m$ such that $g^m = e$ (the identity), if such an $m$ exists.
    D.  The number of distinct subgroups that contain $g$.
    E.  Infinity, if $G$ is an infinite group.
    ans: C

140. If for an element $g \in G$, there is no positive integer $m$ such that $g^m = e$, then $g$ is said to have:
    A.  Order 0
    B.  Order 1
    C.  Prime order
    D.  Infinite order
    E.  Negative order
    ans: D

141. In the group $S_3$, what is the order of the transposition $\tau = (12)$?
    A.  1
    B.  2
    C.  3
    D.  6
    E.  Infinite
    ans: B

142. In the group $S_3$, what is the order of the 3-cycle $\sigma = (123)$?
    A.  1
    B.  2
    C.  3
    D.  6
    E.  Infinite
    ans: C

143. A major theorem (Lagrange's Theorem), previewed in the lecture, states that in a finite group $G$, the order of any element $g \in G$:
    A.  Must be equal to the order of $G$.
    B.  Must be a prime number.
    C.  Must divide the order of $G$.
    D.  Is always less than or equal to $n$ if $G=S_n$.
    E.  Is equal to the order of the cyclic subgroup $\langle g \rangle$. (This is true, but Lagrange's theorem relates it to $|G|$).
    ans: C

144. The mathematician Niels Abel, after whom Abelian groups are named, died young from:
    A.  A duel
    B.  Tuberculosis
    C.  A laboratory accident
    D.  Political persecution
    E.  Influenza
    ans: B

145. Evariste Galois, another founder of group theory, died at age 20 as a result of:
    A.  Tuberculosis
    B.  A duel
    C.  A shipwreck
    D.  An earthquake
    E.  Cholera
    ans: B

146. The identity element in the group $(\mathbb{Z}, +)$ is:
    A. 1
    B. -1
    C. 0
    D. There is no identity element.
    E. Every integer is an identity element.
    ans: C

147. Which of the following is true about the subgroup $0\mathbb{Z}$ of $(\mathbb{Z}, +)$?
    A. It is equal to $\mathbb{Z}$ itself.
    B. It is the set $\{0\}$, which is the trivial subgroup containing only the identity.
    C. It is the set of all even integers.
    D. It is not a subgroup because $0$ is not positive.
    E. It contains all integers.
    ans: B

148. If $H$ is a subgroup of an Abelian group $G$, then $H$ must be:
    A.  Non-Abelian
    B.  Abelian
    C.  Cyclic
    D.  Finite
    E.  The trivial subgroup $\{e\}$
    ans: B

149. The set $GL_n(\mathbb{Q})$ consists of invertible $n \times n$ matrices with entries from:
    A.  Real numbers ($\mathbb{R}$)
    B.  Complex numbers ($\mathbb{C}$)
    C.  Integers ($\mathbb{Z}$)
    D.  Rational numbers ($\mathbb{Q}$)
    E.  Natural numbers ($\mathbb{N}$)
    ans: D

150. In the arithmetic of evens and odds, if `\bar{0}` represents even numbers and `\bar{1}` represents odd numbers, what is the result of `\bar{1} + \bar{1}`?
    A.  `\bar{0}`
    B.  `\bar{1}`
    C.  `\bar{2}`
    D.  Undefined
    E.  `\overline{10}`
    ans: A

151. According to the lecture's notation for even/odd arithmetic, `\bar{0} \cdot \bar{1}` (even times odd) results in:
    A.  `\bar{1}` (odd)
    B.  `\bar{0}` (even)
    C.  `\overline{01}`
    D.  Depends on the specific numbers
    E.  `\overline{-1}`
    ans: B

152. Two integers `A` and `B` are defined to be congruent modulo `n` (a positive integer), written $A \equiv B \pmod{n}$, if:
    A.  $n$ divides $A+B$
    B.  $A-B$ divides $n$
    C.  $n$ divides $A-B$
    D.  $A = B + nk$ for some $k > 0$
    E.  $B = A + nk$ for some $k < 0$
    ans: C

153. The statement $A \equiv B \pmod{n}$ is equivalent to saying that $A-B$ is an element of which subgroup of $(\mathbb{Z},+)$?
    A.  $\mathbb{Z}$
    B.  $\{0\}$
    C.  $n\mathbb{Z}$
    D.  $(A-B)\mathbb{Z}$
    E.  $\mathbb{Z}/n\mathbb{Z}$
    ans: C

154. Which of the following is NOT a property of the congruence relation modulo $n$?
    A.  Reflexivity ($A \equiv A \pmod{n}$)
    B.  Symmetry (if $A \equiv B \pmod{n}$, then $B \equiv A \pmod{n}$)
    C.  Transitivity (if $A \equiv B \pmod{n}$ and $B \equiv C \pmod{n}$, then $A \equiv C \pmod{n}$)
    D.  Antisymmetry (if $A \equiv B \pmod{n}$ and $B \equiv A \pmod{n}$, then $A=B$)
    E.  It is an equivalence relation.
    ans: D

155. The equivalence class of an integer $A$ modulo $n$, denoted $\bar{A}$, is the set:
    A.  $\{A, A+n, A+2n\}$
    B.  $\{A + kn \mid k \in \mathbb{Z}\}$
    C.  $\{kn - A \mid k \in \mathbb{Z}\}$
    D.  $\{A, n\}$
    E.  $\{x \in \mathbb{Z} \mid \text{gcd}(x,n) = A\}$
    ans: B

156. The equivalence classes of integers modulo $n$ are identified as cosets of which subgroup $H$ in the group $G=\mathbb{Z}$?
    A.  $H = \{0\}$
    B.  $H = \mathbb{Z}$
    C.  $H = n\mathbb{Z}$
    D.  $H = \{1, n\}$
    E.  $H = \mathbb{Z}/n\mathbb{Z}$
    ans: C

157. How many distinct equivalence classes (or cosets of $n\mathbb{Z}$) are there in $\mathbb{Z}$ modulo $n$?
    A.  $n-1$
    B.  $n$
    C.  $n+1$
    D.  Infinitely many if $n>1$
    E.  $2^n$
    ans: B

158. A standard complete set of distinct representatives for the equivalence classes modulo $n$ is:
    A.  $\{1, 2, \dots, n\}$
    B.  $\{0, 1, \dots, n-1\}$
    C.  $\{-n, 0, n\}$
    D.  All prime integers less than $n$.
    E.  $\{n, n+1, \dots, 2n-1\}$
    ans: B

159. The existence of a unique remainder $R$ such that $A = nQ + R$ with $0 \le R < n$ for any integer $A$ and positive integer $n$ is guaranteed by:
    A.  The Well-Ordering Principle
    B.  The Division Algorithm
    C.  Fermat's Little Theorem
    D.  The Chinese Remainder Theorem
    E.  Euclidean Algorithm
    ans: B

160. The set of all equivalence classes of integers modulo $n$ is typically denoted by:
    A.  $\mathbb{Z}_n$
    B.  $n/\mathbb{Z}$
    C.  $\mathbb{Z}[n]$
    D.  $\mathbb{Z} / n\mathbb{Z}$
    E.  $\text{Map}(\mathbb{Z}, n)$
    ans: D

161. The sum of two equivalence classes $\bar{A}$ and $\bar{B}$ in $\mathbb{Z}/n\mathbb{Z}$ is defined as $\bar{A} + \bar{B} = $:
    A.  $\overline{A-B}$
    B.  $\overline{AB}$
    C.  $\overline{A+B}$
    D.  $\overline{\text{min}(A,B)}$
    E.  $\overline{A^n + B^n}$
    ans: C

162. The multiplication of two equivalence classes $\bar{A}$ and $\bar{B}$ in $\mathbb{Z}/n\mathbb{Z}$ is defined as $\bar{A} \cdot \bar{B} = $:
    A.  $\overline{A+B}$
    B.  $\overline{AB}$
    C.  $\overline{A/B}$
    D.  $\overline{A^B}$
    E.  $\overline{n(A+B)}$
    ans: B

163. The operations of addition and multiplication in $\mathbb{Z}/n\mathbb{Z}$ are "well-defined," meaning:
    A.  They always produce an integer result.
    B.  The result does not depend on the specific representatives chosen for the equivalence classes.
    C.  They are only defined if $n$ is prime.
    D.  They satisfy the associative property.
    E.  They always yield a result in the set $\{0, 1, \dots, n-1\}$.
    ans: B

164. What is the identity element for addition in the group $(\mathbb{Z}/n\mathbb{Z}, +)$?
    A.  $\bar{1}$
    B.  $\bar{n}$
    C.  $\bar{0}$
    D.  $\overline{-1}$
    E.  There is no fixed identity element.
    ans: C

165. What is the additive inverse of an element $\bar{A}$ in $(\mathbb{Z}/n\mathbb{Z}, +)$?
    A.  $\overline{A}$
    B.  $\overline{1-A}$
    C.  $\overline{n/A}$
    D.  $\overline{-A}$ (or equivalently $\overline{n-A}$)
    E.  $\bar{A}$ does not always have an additive inverse.
    ans: D

166. The associativity of addition in $(\mathbb{Z}/n\mathbb{Z}, +)$ is a property that:
    A.  Needs to be proven separately for each $n$.
    B.  Holds only if $n$ is prime.
    C.  Is inherited from the associativity of addition in $\mathbb{Z}$.
    D.  Is a consequence of the division algorithm.
    E.  Only holds for non-zero elements.
    ans: C

167. The group $(\mathbb{Z}/n\mathbb{Z}, +)$ is:
    A.  Non-abelian for $n > 2$.
    B.  Abelian only if $n$ is a prime number.
    C.  Always cyclic and thus always abelian.
    D.  Cyclic if $n$ is prime, but not necessarily otherwise.
    E.  Not a group if $n$ is composite.
    ans: C

168. As stated in the lecture, a generator for the cyclic group $(\mathbb{Z}/n\mathbb{Z}, +)$ is:
    A.  $\bar{0}$
    B.  $\bar{n}$
    C.  $\bar{1}$
    D.  $\overline{n/2}$ (if $n$ is even)
    E.  Any $\bar{k}$ where $k \neq 0$.
    ans: C

169. The subgroup $n\mathbb{Z}$ is normal in $(\mathbb{Z}, +)$ primarily because:
    A.  $n\mathbb{Z}$ is infinite.
    B.  $(\mathbb{Z}, +)$ is an abelian group.
    C.  $n$ is a positive integer.
    D.  $n\mathbb{Z}$ contains $0$.
    E.  All cyclic groups have normal subgroups.
    ans: B

170. To find the last two decimal digits of $2^{1000}$, one computes $2^{1000}$ modulo what number?
    A.  $2$
    B.  $10$
    C.  $100$
    D.  $1000$
    E.  $2^{10}$
    ans: C

171. In the lecture's calculation of $2^{1000} \pmod{100}$, it was established that $2^{10} \equiv 24 \pmod{100}$. What is $2^{20} \pmod{100}$?
    A.  $48 \pmod{100}$
    B.  $576 \pmod{100}$
    C.  $240 \pmod{100}$
    D.  $76 \pmod{100}$
    E.  $1024^2 \pmod{100}$
    ans: D

172. Given $2^{20} \equiv 76 \pmod{100}$ and $76^k \equiv 76 \pmod{100}$ for $k \ge 1$, what is $2^{1000} \pmod{100}$?
    A.  $24 \pmod{100}$
    B.  $50 \pmod{100}$
    C.  $76 \pmod{100}$
    D.  $0 \pmod{100}$
    E.  $1 \pmod{100}$
    ans: C

173. Is the set $\mathbb{Z}/n\mathbb{Z}$ with the operation of multiplication (defined as $\bar{A} \cdot \bar{B} = \overline{AB}$) always a group?
    A.  Yes, for all $n \ge 1$.
    B.  Yes, but only if $n$ is a prime number.
    C.  No, primarily because $\bar{0}$ (if $n>1$) lacks a multiplicative inverse.
    D.  No, because multiplication is not always associative modulo $n$.
    E.  Yes, if one excludes $\bar{0}$ and $n$ is prime.
    ans: C

174. The multiplicative group of units modulo $n$, denoted $(\mathbb{Z}/n\mathbb{Z})^\times$, consists of elements $\bar{A} \in \mathbb{Z}/n\mathbb{Z}$ such that:
    A.  $A \neq 0$.
    B.  $\bar{A}$ has a multiplicative inverse in $\mathbb{Z}/n\mathbb{Z}$.
    C.  $A$ is a prime number.
    D.  $A$ divides $n$.
    E.  $\bar{A} \neq \bar{0}$ and $\bar{A} \neq \bar{1}$.
    ans: B

175. What is the identity element in the multiplicative group $(\mathbb{Z}/n\mathbb{Z})^\times$?
    A.  $\bar{0}$
    B.  $\bar{1}$
    C.  $\overline{-1}$
    D.  $\bar{n}$
    E.  It depends on $n$.
    ans: B

176. The sum of subgroups $m\mathbb{Z} + n\mathbb{Z} = \{ma + nb \mid a,b \in \mathbb{Z}\}$ is itself a subgroup of $\mathbb{Z}$. This subgroup is equal to:
    A.  $\text{lcm}(m,n)\mathbb{Z}$
    B.  $(m+n)\mathbb{Z}$
    C.  $(mn)\mathbb{Z}$
    D.  $\text{gcd}(m,n)\mathbb{Z}$
    E.  $\mathbb{Z}$ if $m=1$ or $n=1$, otherwise $\{0\}$.
    ans: D

177. The proof that $m\mathbb{Z} + n\mathbb{Z} = d\mathbb{Z}$ (where $d=\text{gcd}(m,n)$) relies on the property that $d$ is the unique positive integer such that $d|m$, $d|n$, and:
    A.  $d$ is the smallest positive integer representable as $mx+ny$.
    B.  If any integer $e$ divides both $m$ and $n$, then $e$ divides $d$.
    C.  $d$ is less than or equal to both $|m|$ and $|n|$.
    D.  Both A and B are crucial.
    E.  $d$ is prime.
    ans: D

178. An element $\bar{A} \in \mathbb{Z}/n\mathbb{Z}$ is in the multiplicative group $(\mathbb{Z}/n\mathbb{Z})^\times$ if and only if:
    A.  $A \neq 0$.
    B.  $A$ is a prime number.
    C.  $\text{gcd}(A,n) = 1$.
    D.  $A$ divides $n$.
    E.  $n$ divides $A$.
    ans: C

179. If $\text{gcd}(A,n)=1$, then $\bar{A}$ has a multiplicative inverse modulo $n$. This is because the condition $\text{gcd}(A,n)=1$ implies:
    A.  $A$ must be prime.
    B.  $n$ must be prime.
    C.  There exist integers $r, s$ such that $Ar + ns = 1$.
    D.  $A < n$.
    E.  $A$ is odd and $n$ is even.
    ans: C

180. For a prime number $p$, the multiplicative group $(\mathbb{Z}/p\mathbb{Z})^\times$ consists of:
    A.  All elements $\{\bar{0}, \bar{1}, \dots, \overline{p-1}\}$.
    B.  Only $\{\bar{1}\}$.
    C.  $\{\bar{1}, \bar{2}, \dots, \overline{p-1}\}$.
    D.  All elements $\bar{k}$ such that $k$ is prime.
    E.  All elements $\bar{k}$ such that $k$ is even.
    ans: C

181. What is the order of the group $(\mathbb{Z}/p\mathbb{Z})^\times$ when $p$ is a prime number?
    A.  $p$
    B.  $p-1$
    C.  $p+1$
    D.  $1$
    E.  $p!$
    ans: B

182. For a prime $p$ and an integer $e \ge 1$, the order of the group $(\mathbb{Z}/p^e\mathbb{Z})^\times$ is:
    A.  $p^e$
    B.  $p^e - 1$
    C.  $p^{e-1}(p-1)$
    D.  $(p-1)^e$
    E.  $p^e / (p-1)$
    ans: C

183. The number of elements in $(\mathbb{Z}/p^e\mathbb{Z})^\times$ is found by taking the total number of elements $p^e$ and subtracting the count of elements that are:
    A.  Multiples of $p^e$.
    B.  Multiples of $p$.
    C.  Prime numbers less than $p^e$.
    D.  Zero or one.
    E.  Greater than $p^e/2$.
    ans: B

184. The property $\bar{A}(\bar{B}+\bar{C}) = \bar{A}\bar{B} + \bar{A}\bar{C}$ in $\mathbb{Z}/n\mathbb{Z}$ is known as the:
    A.  Commutative law for multiplication.
    B.  Associative law for addition.
    C.  Distributive law (of multiplication over addition).
    D.  Existence of identity.
    E.  Cancellation law.
    ans: C

185. When working with an additive group where the operation is denoted by `+`, the element $g$ added to itself $k$ times is written as:
    A.  $g^k$
    B.  $k \cdot g$ (or $kg$)
    C.  $g \circ k$
    D.  $k^g$
    E.  $g \oplus k$
    ans: B

186. A crucial point for the definition $(\mathbb{Z}/n\mathbb{Z})^\times = \{ \bar{A} \mid \text{gcd}(A,n)=1 \}$ to be valid is that:
    A.  $n$ must be an odd number.
    B.  $A$ must be a positive integer.
    C.  The condition $\text{gcd}(A,n)=1$ must yield the same truth value for any representative $A$ of the class $\bar{A}$.
    D.  The GCD must always be less than $n$.
    E.  $A$ must be strictly less than $n$.
    ans: C

187. If $H$ is a normal subgroup of a group $G$, the lecture mentioned that the set of cosets $G/H$ forms a group. The natural map $\pi: G \to G/H$ defined by $\pi(g) = gH$ has which subgroup as its kernel?
    A.  $G$
    B.  $H$
    C.  $\{e\}$ (the identity element of $G$)
    D.  $G/H$
    E.  The center of $G$, $Z(G)$
    ans: B

188. The natural map $\text{red}: \mathbb{Z} \to \mathbb{Z}/n\mathbb{Z}$ given by $\text{red}(A) = \bar{A}$ is a group homomorphism. Its kernel is:
    A.  $\mathbb{Z}$
    B.  $\{0\}$
    C.  $n\mathbb{Z}$
    D.  $(\mathbb{Z}/n\mathbb{Z})^\times$
    E.  $\{\bar{0}, \bar{1}, \dots, \overline{n-1}\}$
    ans: C

189. The fact that the map $\text{red}: (\mathbb{Z},+) \to (\mathbb{Z}/n\mathbb{Z},+)$ is a homomorphism means that for any $A, B \in \mathbb{Z}$:
    A.  $\text{red}(A \cdot B) = \text{red}(A) \cdot \text{red}(B)$
    B.  $\text{red}(A+B) = \text{red}(A) + \text{red}(B)$
    C.  $\text{red}(A^B) = \text{red}(A)^{\text{red}(B)}$
    D.  $\text{red}(A) = \text{red}(B)$ implies $A=B$
    E.  The map is always injective.
    ans: B

190. The statement "if $H$ is a normal subgroup of $G$, then there exists a homomorphism whose kernel is $H$" is illustrated in the lecture by the example:
    A.  $G=S_3$, $H=A_3$, and the sign homomorphism.
    B.  $G=\mathbb{Z}$, $H=n\mathbb{Z}$, and the reduction map $A \mapsto \bar{A}$.
    C.  $G=GL_n(\mathbb{R})$, $H=SL_n(\mathbb{R})$, and the determinant map.
    D.  Any group $G$ and $H=\{e\}$, with the identity map.
    E.  $G=\mathbb{R}^\times$, $H=\{1, -1\}$, and the squaring map $x \mapsto x^2$.
    ans: B

191. The lecture indicates that the structure of $\mathbb{Z}/n\mathbb{Z}$ (having both addition and multiplication that distribute) will be a major theme when studying:
    A.  Field Theory
    B.  Galois Theory
    C.  Topology
    D.  Ring Theory
    E.  Category Theory
    ans: D

192. What happens to information when passing from the integers $\mathbb{Z}$ to the set of cosets $\mathbb{Z}/n\mathbb{Z}$?
    A. Information is gained about the divisors of $n$.
    B. No information is lost; it's an isomorphic mapping.
    C. Information is lost; for example, distinct integers can map to the same coset.
    D. The amount of information remains constant but is restructured.
    E. Information is lost only if $n$ is composite.
    ans: C

193. The subgroups of the additive group of integers $(\mathbb{Z}, +)$ are all of the form:
    A.  $\{0, 1, \dots, N-1\}$ for some $N > 0$
    B.  $N\mathbb{Z} = \{Nk \mid k \in \mathbb{Z}\}$ for some integer $N \ge 0$
    C.  The set of prime numbers
    D.  The set of non-negative integers
    E.  Finite sets of integers only
    ans: B

194. The notation $\mathbb{Z}/N\mathbb{Z}$, introduced by Gauss, represents:
    A.  The set of integers not divisible by $N$
    B.  The group of integers modulo $N$ under addition
    C.  The set of rational numbers with denominator $N$
    D.  The group of units modulo $N$ under multiplication
    E.  The integers from $1$ to $N$
    ans: B

195. Gauss's famous book "Disquisitiones Arithmeticae" (1801), which introduced modular arithmetic, was written in:
    A.  German
    B.  French
    C.  Latin
    D.  English
    E.  Greek
    ans: C

196. The elements of the group $\mathbb{Z}/N\mathbb{Z}$ (for $N > 0$) can be represented as:
    A.  $\{\bar{0}, \bar{1}, \dots, \overline{N-1}\}$
    B.  $\{1, 2, \dots, N\}$
    C.  All integers $k$ such that $\text{gcd}(k, N) = 1$
    D.  $\{-N/2, \dots, N/2-1\}$ if $N$ is even
    E.  Infinite classes of integers
    ans: A

197. In $\mathbb{Z}/N\mathbb{Z}$, two integer classes $\bar{A}$ and $\bar{B}$ are equal, $\bar{A} = \bar{B}$, if and only if:
    A.  $A = B$
    B.  $A - B = N$
    C.  $N$ divides $A - B$
    D.  $A \text{ divides } N \text{ and } B \text{ divides } N$
    E.  $A + B = N$
    ans: C

198. The order of the group $\mathbb{Z}/N\mathbb{Z}$ (for $N > 0$) is:
    A.  $1$
    B.  $N$
    C.  $N-1$
    D.  Infinite
    E.  $N!$
    ans: B

199. The addition operation $\bar{A} + \bar{B}$ in $\mathbb{Z}/N\mathbb{Z}$ is defined as:
    A.  $\overline{A+B}$
    B.  $\overline{AB}$
    C.  $\overline{A-B}$
    D.  $\overline{\text{min}(A,B)}$
    E.  $\overline{N \text{ if } A+B > N \text{ else } A+B}$
    ans: A

200. The group $\mathbb{Z}/N\mathbb{Z}$ under addition is:
    A.  A non-abelian group
    B.  A cyclic group of order $N$
    C.  A group with no identity element
    D.  Isomorphic to $S_N$
    E.  A group where every non-identity element has order 2
    ans: B

201. A natural generator for the cyclic group $\mathbb{Z}/N\mathbb{Z}$ (for $N > 1$) is:
    A.  $\bar{0}$
    B.  $\bar{1}$
    C.  $\overline{N-1}$
    D.  Any $\bar{k}$ such that $\text{gcd}(k,N)=1$
    E.  Both B and D are correct (B is a specific instance of D)
    ans: E

202. The natural homomorphism $F: \mathbb{Z} \to \mathbb{Z}/N\mathbb{Z}$ is defined by:
    A.  $F(A) = \bar{A}$ (the remainder of $A$ after division by $N$)
    B.  $F(A) = \overline{A \cdot N}$
    C.  $F(A) = \bar{1}$ if $A$ is prime, $\bar{0}$ otherwise
    D.  $F(A) = \overline{A^{-1}}$
    E.  $F(A) = \bar{N}$
    ans: A

203. The kernel of the surjective homomorphism $F: \mathbb{Z} \to \mathbb{Z}/N\mathbb{Z}$ where $F(A)=\bar{A}$ is:
    A.  $\{0\}$
    B.  $\mathbb{Z}$
    C.  $N\mathbb{Z}$ (the set of multiples of $N$)
    D.  $\{\bar{0}, \bar{1}, \dots, \overline{N-1}\}$
    E.  The set of units in $\mathbb{Z}$
    ans: C

204. The set of integers $\mathbb{Z}$ forms a ring under which operations?
    A.  Addition and subtraction
    B.  Addition and multiplication
    C.  Multiplication and division
    D.  Max and min
    E.  Exponentiation and addition
    ans: B

205. The quotient structure $\mathbb{Z}/N\mathbb{Z}$ forms a ring under the operations:
    A.  $\bar{A}+\bar{B} = \overline{A+B}$ and $\bar{A} \cdot \bar{B} = \overline{AB}$
    B.  $\bar{A}+\bar{B} = \overline{A+B}$ and $\bar{A} \cdot \bar{B} = \overline{A^B}$
    C.  $\bar{A}+\bar{B} = \overline{AB}$ and $\bar{A} \cdot \bar{B} = \overline{A+B}$
    D.  Only addition forms a group structure; multiplication is not well-defined.
    E.  $\bar{A}+\bar{B} = \overline{\text{max}(A,B)}$ and $\bar{A} \cdot \bar{B} = \overline{\text{min}(A,B)}$
    ans: A

206. The "units" of a ring $R$, denoted $R^*$, are the set of elements $A \in R$ such that:
    A.  $A \neq 0$
    B.  There exists $B \in R$ with $AB = 1$ (multiplicative inverse)
    C.  There exists $B \in R$ with $A+B = 0$ (additive inverse)
    D.  $A$ is a generator of $R$ under addition
    E.  $A$ is idempotent ($A^2=A$)
    ans: B

207. The group of units $\mathbb{Z}^*$ of the ring of integers $\mathbb{Z}$ is:
    A.  $\{0, 1\}$
    B.  $\{1\}$
    C.  $\{-1, 1\}$
    D.  All non-zero integers
    E.  All prime numbers
    ans: C

208. For a subgroup $H$ of a group $G$, the set of left cosets is denoted $G/H$. When can a group structure be naturally defined on this set of cosets?
    A.  Always
    B.  Only if $G$ is abelian
    C.  Only if $H$ is a normal subgroup of $G$
    D.  Only if $H$ is a cyclic subgroup
    E.  Only if $G$ is finite
    ans: C

209. If $H = \text{ker}(F)$ for a homomorphism $F: G \to G'$, the cosets $AH$ correspond to:
    A.  Subgroups of $G'$
    B.  Elements of $G$ not in $H$
    C.  The fibers of the map $F$ (i.e., $F^{-1}(y)$ for $y \in \text{Im}(F)$)
    D.  Elements of order 2 in $G$
    E.  Normalizers of elements in $H$
    ans: C

210. The image of a group homomorphism $F: G \to G'$ is always:
    A.  A normal subgroup of $G$
    B.  A subgroup of $G'$
    C.  The entire group $G'$
    D.  Isomorphic to $G$
    E.  The trivial group in $G'$
    ans: B

211. The process of defining a group structure on the set of cosets $G/H$ by using the group structure of $\text{Im}(F)$ (where $H=\text{ker}(F)$) is an example of:
    A.  Direct product construction
    B.  Transport of structure
    C.  Cayley's theorem
    D.  Lagrange's theorem
    E.  Sylow's theorem
    ans: B

212. If $H = \text{ker}(F: G \to G')$, the multiplication of cosets $(AH)(BH)$ in $G/H$ is defined to correspond to $F(A)F(B)$ in $\text{Im}(F)$. This means $(AH)(BH)$ equals:
    A.  $H(AB)$
    B.  $(AB)H$
    C.  $(BA)H$
    D.  $A^{-1}BH$
    E.  $H$
    ans: B

213. The identity element in the quotient group $G/H$ (where $H$ is a normal subgroup) is:
    A.  $H$ itself (i.e., $eH$)
    B.  $G$
    C.  The coset $gH$ where $g$ is the identity of $G$ (same as A)
    D.  Any coset $AH$
    E.  The empty set
    ans: C

214. The inverse of the coset $AH$ in the quotient group $G/H$ is:
    A.  $HA^{-1}$
    B.  $A^{-1}H$
    C.  $H$
    D.  $AH$ itself
    E.  $(AH)^2$
    ans: B

215. The primary difficulty in defining the product of cosets $(AH)(BH)$ as $(AB)H$ for an arbitrary subgroup $H$ is:
    A.  Ensuring associativity
    B.  Finding an identity element
    C.  Ensuring inverses exist
    D.  The operation may not be well-defined (i.e., depends on coset representatives)
    E.  The resulting set $(AB)H$ may not be a coset
    ans: D

216. The proposed coset multiplication $(AH)(BH) = (AB)H$ is not well-defined if, for some $A \in G$ and $h \in H$:
    A.  $AH = HA$
    B.  $H$ is not cyclic
    C.  $A h A^{-1} \notin H$
    D.  $A \in H$
    E.  $G$ is infinite
    ans: C

217. A subgroup $H$ of $G$ is called a normal subgroup if:
    A.  $H$ is abelian
    B.  $aHa^{-1} = H$ for all $a \in G$
    C.  $H$ is the only subgroup of its order
    D.  $H$ is a subgroup of the center $Z(G)$
    E.  For every $h \in H$, $ah=ha$ for all $a \in G$
    ans: B

218. An equivalent condition for $H$ to be a normal subgroup of $G$ is:
    A.  Every left coset $aH$ is equal to some right coset $Hb'$
    B.  For every $a \in G$, the left coset $aH$ is equal to the right coset $Ha$
    C.  $H$ is finite
    D.  $G/H$ has prime order
    E.  $H$ contains all elements of finite order in $G$
    ans: B

219. If $H$ is a normal subgroup of $G$, and we consider the set product $(AH)(BH) = \{a_1h_1a_2h_2 \mid a_1 \in AH, a_2 \in BH, h_1,h_2 \in H \}$, this set is equal to:
    A.  $ABH$
    B.  $BAH$
    C.  $H$
    D.  $A H B H$ which is not necessarily a single coset
    E.  $G$
    ans: A

220. If $H$ is a normal subgroup of $G$, the map $\phi: G \to G/H$ defined by $\phi(a) = aH$ is:
    A.  An injective homomorphism
    B.  A surjective homomorphism
    C.  An isomorphism
    D.  Not necessarily a homomorphism
    E.  A homomorphism only if $G$ is abelian
    ans: B

221. What is the kernel of the natural surjective homomorphism $\phi: G \to G/H$ given by $\phi(a) = aH$?
    A.  $\{e\}$
    B.  $H$
    C.  $G$
    D.  $G/H$
    E.  The center $Z(G)$
    ans: B

222. A key relationship between normal subgroups and homomorphisms is:
    A.  Every subgroup is the kernel of some homomorphism.
    B.  Only trivial subgroups can be kernels.
    C.  Every normal subgroup $H$ of $G$ is the kernel of some homomorphism (specifically, $G \to G/H$).
    D.  The kernel of a homomorphism is normal if and only if the group is abelian.
    E.  Normal subgroups are precisely the images of homomorphisms.
    ans: C

223. The First Isomorphism Theorem for groups states: If $F: G \to G'$ is a surjective group homomorphism with kernel $H$, then:
    A.  $G \cong G'$
    B.  $G/H \cong G'$
    C.  $H \cong G'$
    D.  $G/G' \cong H$
    E.  $G \cong H \times G'$
    ans: B

224. In the context of the First Isomorphism Theorem ($F: G \to G'$ surjective, $\text{ker}(F)=H$), the isomorphism $F_{\text{bar}}: G/H \to G'$ is defined by:
    A.  $F_{\text{bar}}(aH) = F(a)$
    B.  $F_{\text{bar}}(aH) = F(h)$ for some $h \in H$
    C.  $F_{\text{bar}}(aH) = a$
    D.  $F_{\text{bar}}(aH) = (F(a))^{-1}$
    E.  $F_{\text{bar}}(aH) = e'$ (identity in $G'$)
    ans: A

225. The statement "any group homomorphism $F: G \to G'$ factors through the quotient group $G/\text{ker}(F)$" means:
    A.  $F$ can be written as a composition $G \to G/\text{ker}(F) \to \text{Im}(F) \hookrightarrow G'$
    B.  $G/\text{ker}(F)$ is always trivial
    C.  $F$ is always injective if $G/\text{ker}(F)$ is considered
    D.  $G$ is a direct product of $\text{ker}(F)$ and $G/\text{ker}(F)$
    E.  $\text{ker}(F)$ is isomorphic to $\text{Im}(F)$
    ans: A

226. A short exact sequence of groups is a sequence of group homomorphisms $1 \to H \xrightarrow{g} G \xrightarrow{f} G' \to 1$ such that:
    A.  $g$ is surjective, $f$ is injective, and $\text{Im}(g) = \text{Ker}(f)$
    B.  $g$ is injective, $f$ is surjective, and $\text{Ker}(g) = \text{Im}(f)$
    C.  $g$ is injective, $f$ is surjective, and $\text{Im}(g) = \text{Ker}(f)$
    D.  $g$ and $f$ are both isomorphisms
    E.  $G \cong H \times G'$
    ans: C

227. In a short exact sequence $1 \to H \xrightarrow{g} G \xrightarrow{f} G' \to 1$, the First Isomorphism Theorem implies:
    A.  $G \cong H$
    B.  $G \cong G'$
    C.  $H \cong \text{Ker}(f)$
    D.  $G' \cong G/\text{Im}(g)$ (where $\text{Im}(g)$ is identified with a normal subgroup of $G$)
    E.  $H \cong G'$
    ans: D

228. If $1 \to H \to G \to G' \to 1$ is a short exact sequence, does knowing the isomorphism classes of $H$ and $G'$ uniquely determine the isomorphism class of $G$?
    A.  Yes, always.
    B.  Yes, if $G$ is finite.
    C.  Yes, if $H$ is abelian.
    D.  No, not necessarily.
    E.  Yes, if $G'$ is trivial.
    ans: D

229. Consider the sequences $1 \to A_3 \to S_3 \to \mathbb{Z}/2\mathbb{Z} \to 1$ and $1 \to \mathbb{Z}/3\mathbb{Z} \to \mathbb{Z}/6\mathbb{Z} \to \mathbb{Z}/2\mathbb{Z} \to 1$. This pair of examples demonstrates that:
    A.  All groups of order 6 are isomorphic.
    B.  $A_3$ is not isomorphic to $\mathbb{Z}/3\mathbb{Z}$.
    C.  The middle group in a short exact sequence is not uniquely determined by the end groups.
    D.  $S_3$ is abelian.
    E.  The sign homomorphism for $S_3$ is not surjective.
    ans: C

230. The '1's appearing at the ends of a short exact sequence $1 \to H \to G \to G' \to 1$ represent:
    A.  The group of integers $\mathbb{Z}$
    B.  The trivial group (containing only the identity element)
    C.  The cyclic group of order 1 (same as B)
    D.  The field with one element (which is not standard)
    E.  Both B and C are correct.
    ans: E

231. The Latin word "modulus" used by Gauss in "Disquisitiones Arithmeticae" is directly related to the modern notation:
    A.  $|G|$ for the order of a group
    B.  $\det(A)$ for determinant
    C.  $A \equiv B \pmod N$
    D.  $\text{ker}(f)$ for kernel
    E.  $\langle g \rangle$ for cyclic group generated by $g$
    ans: C

232. The terminology "exact sequence" in homological algebra was coined by:
    A.  Gauss and Euler
    B.  Galois and Abel
    C.  Eilenberg and MacLane
    D.  Artin and Noether
    E.  Hilbert and Poincaré
    ans: C

233. If $H$ is a normal subgroup of $G$, the statement "$AH=HA$ as sets" for $A \in G$ implies that for any $h \in H$:
    A.  $Ah = hA$ (i.e., $A$ commutes with every element of $H$)
    B.  $Ah = h'A$ for some $h' \in H$ (possibly $h' \neq h$)
    C.  $A=e$ or $h=e$
    D.  $H$ must be abelian
    E.  $A \in H$
    ans: B

234. If $H$ is a normal subgroup of $G$, the product of two cosets $(AH)$ and $(BH)$ is $ABH$. This definition is well-defined because the normality of $H$ ensures that:
    A.  If $A'H = AH$ and $B'H = BH$, then $(AB)H = (A'B')H$.
    B.  $ABH$ is always non-empty.
    C.  $H$ is finite.
    D.  $G$ is abelian.
    E.  $ABH$ is itself a subgroup.
    ans: A

235. The kernel of any group homomorphism $F: G \to G'$ is always:
    A.  A trivial subgroup of $G$.
    B.  A normal subgroup of $G$.
    C.  Isomorphic to the image of $F$.
    D.  A cyclic subgroup of $G$.
    E.  A subgroup of $G'$.
    ans: B

236. The group $(\mathbb{Z}/N\mathbb{Z})^*$ of units in the ring $\mathbb{Z}/N\mathbb{Z}$ consists of elements $\bar{k}$ such that:
    A.  $k$ is a prime number.
    B.  $\text{gcd}(k, N) = 1$.
    C.  $k$ divides $N$.
    D.  $0 < k < N$.
    E.  $\bar{k}$ is a generator of $(\mathbb{Z}/N\mathbb{Z}, +)$.
    ans: B

237. The concept of "transport de structure" (transport of structure) was invoked in the lecture to explain how:
    A.  A subgroup inherits operations from its parent group.
    B.  The set of cosets $G/\text{ker}(F)$ gets a group structure from $\text{Im}(F)$.
    C.  Isomorphic groups share the same structural properties.
    D.  A group can be represented as a group of permutations.
    E.  Properties of $\mathbb{Z}$ are transported to $\mathbb{Z}/N\mathbb{Z}$.
    ans: B

### Chapter 3

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

