### Chapter 1: Matrix Operations

1.  An $m \times n$ matrix is a collection of numbers arranged in a rectangular array. If $m=1$ and $n > 1$, the matrix is called a:
    A.  Column vector
    B.  Square matrix
    C.  Row vector
    D.  Scalar
    E.  Zero matrix
    ans: C

2.  The sum of two matrices A and B is defined only if:
    A.  A is a row vector and B is a column vector.
    B.  They are both square matrices.
    C.  The number of columns of A equals the number of rows of B.
    D.  They have the same shape (same m and same n).
    E.  One is the transpose of the other.
    ans: D

3.  If A is an $l \times m$ matrix and B is an $m \times n$ matrix, their product AB is an $l \times n$ matrix P. The entry $p_{ij}$ is calculated as:
    A.  The sum of products of corresponding entries from the $i$-th column of A and $j$-th row of B.
    B.  The product of the $i$-th row of A and the $j$-th column of B (dot product).
    C.  The product of the $i$-th column of A and the $j$-th row of B.
    D.  $a_{im} \times b_{mj}$.
    E.  The sum of all entries in the $i$-th row of A and $j$-th column of B.
    ans: B

4.  Which of the following matrix properties is NOT generally true for matrices A, B, C of appropriate sizes?
    A.  $A(B+C) = AB + AC$
    B.  $(AB)C = A(BC)$
    C.  $AB = BA$
    D.  $c(AB) = (cA)B = A(cB)$ for a scalar c
    E.  $I_m A = A = A I_n$ if A is $m \times n$
    ans: C

5.  An $n \times n$ matrix A is called invertible if there exists a matrix B such that:
    A.  $AB = I_n$ only
    B.  $BA = I_n$ only
    C.  $AB = I_n$ and $BA = I_n$
    D.  $A+B = 0$
    E.  $A-B = I_n$
    ans: C

6.  If A and B are invertible $n \times n$ matrices, then the inverse of their product, $(AB)^{-1}$, is:
    A.  $A^{-1}B^{-1}$
    B.  $B^{-1}A^{-1}$
    C.  $(BA)^{-1}$
    D.  $A B$
    E.  The identity matrix $I_n$
    ans: B

7.  The set of all invertible $n \times n$ matrices is called the:
    A.  Null space of n
    B.  n-dimensional vector space
    C.  General linear group, $GL_n$
    D.  Symmetric group, $S_n$
    E.  Orthogonal group, $O_n$
    ans: C

8.  Consider block multiplication: If $M = [A \quad B]$ where A is $m \times r$ and B is $m \times (n-r)$, and $M' = \begin{bmatrix} A' \\ B' \end{bmatrix}$ where A' is $r \times p$ and B' is $(n-r) \times p$. Then $MM'$ is:
    A.  $AA' + BB'$
    B.  $AB' + BA'$
    C.  $[AA' \quad BB']$
    D.  $\begin{bmatrix} AA' \\ BB' \end{bmatrix}$
    E.  Not defined unless $m=p$
    ans: A

9.  Left multiplication of a matrix X by an elementary matrix of Type (i) (which adds $a$ times row $j$ to row $i$) corresponds to:
    A.  Adding $a$ times column $j$ of X to column $i$ of X.
    B.  Interchanging row $i$ and row $j$ of X.
    C.  Multiplying row $i$ of X by $a$.
    D.  Adding $a$ times row $j$ of X to row $i$ of X.
    E.  Replacing row $i$ of X with row $j$ of X.
    ans: D

10. Which of the following is NOT a property of a row echelon matrix?
    A.  The first nonzero entry in every row is 1 (called a pivot).
    B.  The entries above a pivot are zero.
    C.  The first nonzero entry of row $i+1$ is to the right of the first nonzero entry of row $i$.
    D.  All entries below a pivot are zero.
    E.  All pivots must be on the main diagonal.
    ans: E

11. A system of linear equations $AX=B$ has the same solutions as $A'X=B'$ if $M'=[A'|B']$ is obtained from $M=[A|B]$ by:
    A.  Any matrix multiplication.
    B.  Adding B to A.
    C.  A sequence of elementary row operations.
    D.  Transposing M.
    E.  Taking the inverse of M.
    ans: C

12. A square matrix A is a product of elementary matrices if and only if:
    A.  A is a diagonal matrix.
    B.  A can be reduced to the identity by a sequence of elementary row operations.
    C.  A has a row of zeros.
    D.  det(A) = 0.
    E.  A is a zero matrix.
    ans: B

13. Which of the following conditions is NOT equivalent to a square matrix A being invertible?
    A.  A can be reduced to the identity matrix by elementary row operations.
    B.  The system $AX=0$ has only the trivial solution $X=0$.
    C.  A is a product of elementary matrices.
    D.  The determinant of A is non-zero.
    E.  A has at least one row of zeros.
    ans: E

14. To compute the inverse $A^{-1}$ of an invertible matrix A using row operations, we form the augmented matrix $[A|I]$ and row reduce A to I. The resulting matrix on the right side will be:
    A.  $I$
    B.  $A$
    C.  $A^{-1}$
    D.  $A^T$
    E.  The zero matrix
    ans: C

15. If A is an $m \times n$ matrix, its transpose $A^T$ is an $n \times m$ matrix where $(A^T)_{ij} = A_{ji}$. Which property of transposes is INCORRECT?
    A.  $(A+B)^T = A^T + B^T$
    B.  $(cA)^T = cA^T$
    C.  $(AB)^T = A^T B^T$
    D.  $(A^T)^T = A$
    E.  If A is invertible, $(A^{-1})^T = (A^T)^{-1}$
    ans: C

16. The determinant of a $2 \times 2$ matrix $\begin{bmatrix} a & b \\ c & d \end{bmatrix}$ is:
    A.  $ab-cd$
    B.  $ad-bc$
    C.  $ac-bd$
    D.  $ad+bc$
    E.  $bc-ad$
    ans: B

17. Which of these is NOT a fundamental property used to characterize the determinant function $d(A)$ (as listed in properties 3.5-3.7)?
    A.  $d(I) = 1$.
    B.  $d(A)$ is linear in the rows of the matrix.
    C.  If two adjacent rows of A are equal, then $d(A) = 0$.
    D.  $d(AB) = d(A)d(B)$.
    E.  $d(A)$ is unchanged if a multiple of one row is added to another row (this is derived).
    ans: D

18. If E is an elementary matrix obtained by interchanging two rows of $I_n$, then det(E) is:
    A.  1
    B.  -1
    C.  0
    D.  $c$, where $c$ is a scalar used in the operation
    E.  $n$
    ans: B

19. If E is an elementary matrix obtained by multiplying a row of $I_n$ by a non-zero scalar $c$, then det(E) is:
    A.  1
    B.  -1
    C.  $c$
    D.  $1/c$
    E.  0
    ans: C

20. A square matrix A is invertible if and only if:
    A.  det(A) = 1
    B.  det(A) = 0
    C.  det(A) $\neq$ 0
    D.  det(A) > 0
    E.  det(A) is an integer
    ans: C

21. For any two $n \times n$ matrices A and B, which statement is true?
    A.  det(A+B) = det(A) + det(B)
    B.  det(AB) = det(A)det(B)
    C.  det(cA) = c det(A)
    D.  det(A$^T$) = -det(A)
    E.  If A is invertible, det(A$^{-1}$) = det(A)
    ans: B

22. If A is an invertible matrix, then det(A$^{-1}$) is:
    A.  det(A)
    B.  -det(A)
    C.  1 / det(A)
    D.  0
    E.  1
    ans: C

23. The property det(A) = det(A$^T$) implies that:
    A.  Row operations and column operations have opposite effects on the determinant.
    B.  Determinant properties concerning rows also apply to columns.
    C.  All matrices are symmetric.
    D.  The determinant is always positive.
    E.  The determinant is only defined for symmetric matrices.
    ans: B

24. A permutation matrix P is a square matrix that:
    A.  Has all entries equal to 1.
    B.  Is diagonal with $\pm 1$ on the diagonal.
    C.  Results from permuting the rows of an identity matrix.
    D.  Is always symmetric.
    E.  Has determinant 0.
    ans: C

25. If P is the permutation matrix associated with a permutation $p$, and Q is associated with $q$, then the matrix associated with the composite permutation $pq$ (meaning $p(q(i))$) is:
    A.  $P+Q$
    B.  $QP$
    C.  $PQ$
    D.  $P^{-1}Q$
    E.  $P Q^{-1}$
    ans: C

26. The inverse of a permutation matrix P is:
    A.  $P$ itself
    B.  $-P$
    C.  $P^T$
    D.  $2P$
    E.  Not always existing
    ans: C

27. The sign of a permutation $p$, denoted sign($p$), is equal to:
    A.  The number of elements permuted.
    B.  1 if $p$ is cyclic, -1 otherwise.
    C.  The determinant of the associated permutation matrix P.
    D.  The trace of P.
    E.  0 if $p$ is not a transposition.
    ans: C

28. The complete expansion of the determinant of an $n \times n$ matrix A, $\sum_{p \in S_n} (\text{sign } p) a_{1,p(1)} a_{2,p(2)} \cdots a_{n,p(n)}$, involves how many terms?
    A.  $n^2$
    B.  $2n$
    C.  $n!$
    D.  $n$
    E.  $n^n$
    ans: C

29. The (i, j)-entry of the adjoint of A, (adj A)$_{ij}$, is given by:
    A.  $(-1)^{i+j} \det(A_{ij})$
    B.  $\det(A_{ij})$
    C.  $(-1)^{i+j} \det(A_{ji})$
    D.  $\det(A_{ji})$
    E.  $A_{ji}$
    ans: C

30. For any square matrix A, the product A(adj A) is equal to:
    A.  $I$
    B.  det(A) $A^{-1}$
    C.  (det A) $I$
    D.  adj(A) A$^{-1}$
    E.  The zero matrix
    ans: C

31. If det(A) $\neq$ 0, the inverse $A^{-1}$ can be expressed using the adjoint as:
    A.  det(A) adj(A)
    B.  (1/det A) adj(A)
    C.  adj(A) / det(A$^T$)
    D.  (adj A)$^T$ / det(A)
    E.  adj(A)
    ans: B

32. Cramer's Rule provides a formula for the solutions $x_j$ of a linear system $AX=B$ (where A is invertible) as $x_j = \det(M_j) / \det(A)$. Here, $M_j$ is the matrix obtained from A by:
    A.  Replacing the $j$-th row of A with B.
    B.  Replacing the $j$-th column of A with B.
    C.  Removing the $j$-th column of A.
    D.  Multiplying the $j$-th column of A by B.
    E.  Setting the $j$-th column of A to zero.
    ans: B

33. The operation of "left multiplication by A" on column vectors, $Y=AX$, is called a:
    A.  Non-linear mapping
    B.  Scalar projection
    C.  Linear transformation
    D.  Vector transposition
    E.  Matrix inversion
    ans: C

34. The elementary matrix $E = I + ae_{ij}$ (for $i \neq j$) corresponds to which row operation?
    A.  Interchange row $i$ and row $j$.
    B.  Multiply row $i$ by $a$.
    C.  Add $a$ times row $j$ to row $i$.
    D.  Add $a$ times row $i$ to row $j$.
    E.  Replace row $i$ with $a$ times row $j$.
    ans: C

35. If a $3 \times 3$ matrix A has det(A) = 5, what is det(2A)?
    A.  5
    B.  10
    C.  15
    D.  30
    E.  40
    ans: E

36. A square matrix is called upper triangular if all entries below the main diagonal are zero. The determinant of such a matrix is:
    A.  The sum of the diagonal entries.
    B.  The product of the diagonal entries.
    C.  Always 0.
    D.  Always 1.
    E.  The sum of the first row entries.
    ans: B

37. Which of the following is true about the matrix units $e_{ij}$ (matrix with 1 in (i,j) position, 0 elsewhere)?
    A.  $e_{ij} e_{kl} = e_{il}$ if $j=k$, and 0 otherwise.
    B.  $e_{ij} e_{kl} = e_{kj}$ if $i=l$, and 0 otherwise.
    C.  All matrix units are invertible.
    D.  The sum of all matrix units is the identity matrix.
    E.  The product of any two matrix units is always a matrix unit.
    ans: A

38. Consider the definition of $A_{ij}$ as the matrix obtained by removing row $i$ and column $j$ from A. This is used in the definition of:
    A.  Matrix transpose
    B.  Scalar multiplication
    C.  Expansion by minors for determinants
    D.  Block multiplication
    E.  Row echelon form
    ans: C

39. The sign pattern for cofactor expansion of a determinant is given by $(-1)^{i+j}$. For a $3 \times 3$ matrix, the sign for the $a_{23}$ entry's cofactor is:
    ![](./images/ch1_q39_sign_pattern.png) <!-- This image would show the + - + / - + - / + - + pattern -->
    A.  +
    B.  -
    C.  0
    D.  Depends on $a_{23}$
    E.  1
    ans: B

40. If a square matrix A has a row consisting entirely of zeros, then det(A) is:
    A.  1
    B.  -1
    C.  0
    D.  Depends on other rows
    E.  Undefined
    ans: C

41. If a square matrix A is reduced to a row echelon form A' using only row operations of Type (i) (adding a multiple of one row to another), then:
    A.  det(A) = det(A')
    B.  det(A) = -det(A')
    C.  det(A') = 0
    D.  det(A') = 1
    E.  Their determinants are unrelated.
    ans: A

42. If the system $AX=0$ of $m$ homogeneous equations in $n$ unknowns has $m < n$, then:
    A.  It has only the trivial solution.
    B.  It has infinitely many solutions (at least one non-trivial).
    C.  It has no solutions.
    D.  It has a unique non-trivial solution.
    E.  The number of solutions depends on det(A).
    ans: B

43. The identity matrix $I_n$ is a special case of a:
    A.  Zero matrix
    B.  Skew-symmetric matrix
    C.  Permutation matrix
    D.  Nilpotent matrix
    E.  Singular matrix
    ans: C

44. For the matrix $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$, what is its adjoint, adj(A)?
    A.  $\begin{bmatrix} 4 & -2 \\ -3 & 1 \end{bmatrix}$
    B.  $\begin{bmatrix} 1 & -3 \\ -2 & 4 \end{bmatrix}$
    C.  $\begin{bmatrix} 4 & -3 \\ -2 & 1 \end{bmatrix}$
    D.  $\begin{bmatrix} -4 & 2 \\ 3 & -1 \end{bmatrix}$
    E.  $\begin{bmatrix} 1 & 3 \\ 2 & 4 \end{bmatrix}$
    ans: A

45. If $A = \begin{bmatrix} 0 & 1 & 0 \\ 0 & 0 & 1 \\ 1 & 0 & 0 \end{bmatrix}$ is a permutation matrix, its determinant is:
    A.  0
    B.  1
    C.  -1
    D.  2
    E.  3
    ans: B

46. The trace of a square matrix A, tr(A), is the sum of its diagonal entries. Which of the following is generally NOT true?
    A.  tr(A+B) = tr(A) + tr(B)
    B.  tr(cA) = c tr(A)
    C.  tr(AB) = tr(BA)
    D.  tr(A) = det(A)
    E.  tr(A$^T$) = tr(A)
    ans: D

47. A square matrix A is called nilpotent if $A^k = 0$ for some positive integer $k$. If A is nilpotent, then $I+A$ is:
    A.  Nilpotent
    B.  The zero matrix
    C.  Invertible
    D.  Singular
    E.  The identity matrix
    ans: C

### Chapter 2: GROUPS

1.  A law of composition on a set S is a rule for combining two elements a, b ∈ S to get another element p ∈ S. Formally, it is a map:
    A.  $S \to S$
    B.  $S \to S \times S$
    C.  $S \times S \to S$
    D.  $S \times S \to S \times S$
    E.  $S \to \mathbb{R}$
    ans: C

2.  A law of composition written multiplicatively as 'ab' is associative if for all a, b, c in S:
    A.  $ab = ba$
    B.  $a(bc) = (ab)c$
    C.  $a(b+c) = ab + ac$
    D.  There exists an element 1 such that $a1 = 1a = a$
    E.  For every a, there exists $a^{-1}$ such that $aa^{-1} = 1$
    ans: B

3.  An element 'e' in a set S with a law of composition is an identity element if for all a ∈ S:
    A.  $ae = ea = e$
    B.  $ae = a$ and $ea \ne a$ generally
    C.  $ae = ea = a$
    D.  $aa = e$
    E.  $ae = e$
    ans: C

4.  An element $a \in S$ is invertible if there exists an element $b \in S$ such that (assuming 1 is the identity):
    A.  $ab = 1$
    B.  $ba = 1$
    C.  $ab = ba = 1$
    D.  $ab = a$
    E.  $ab = b$
    ans: C

5.  A group G is a set with a law of composition that satisfies which of the following properties?
    A.  Associativity, existence of an identity, existence of inverses for every element.
    B.  Commutativity, associativity, existence of an identity.
    C.  Existence of an identity, existence of inverses, commutativity.
    D.  Associativity, closure, existence of a unique inverse.
    E.  Closure, commutativity, existence of an identity.
    ans: A

6.  An abelian group is a group whose law of composition is also:
    A.  Associative
    B.  Distributive
    C.  Commutative
    D.  Invertible
    E.  Idempotent
    ans: C

7.  If a and b are elements of a group G, then $(ab)^{-1}$ is equal to:
    A.  $a^{-1}b^{-1}$
    B.  $b^{-1}a^{-1}$
    C.  $ab$
    D.  $(ba)^{-1}$
    E.  $a^{-1}b$
    ans: B

8.  The cancellation law in a group G states that if $ab = ac$, then:
    A.  $b = c$ only if a is the identity.
    B.  $b = c$ always.
    C.  $b = c$ only if G is abelian.
    D.  $a$ must be $b^{-1}c^{-1}$.
    E.  This is not generally true.
    ans: B

9.  The set of $n \times n$ invertible real matrices, $GL_n(\mathbb{R})$, forms a group under:
    A.  Matrix addition
    B.  Matrix multiplication
    C.  Scalar multiplication
    D.  Element-wise product
    E.  Matrix inversion
    ans: B

10. The symmetric group $S_n$ is the group of:
    A.  All $n \times n$ symmetric matrices.
    B.  All symmetries of a regular n-gon.
    C.  All permutations of a set of n elements.
    D.  All $n$-tuples of real numbers under addition.
    E.  All integers modulo n under addition.
    ans: C

11. In the symmetric group $S_3$, with $x$ being a 3-cycle and $y$ a transposition, which relation typically holds? (Assuming $x^3=1, y^2=1$)
    A.  $yx = xy$
    B.  $yx = x^2y$
    C.  $xy = yx^2$
    D.  $xyx = y$
    E.  $yxy = x$
    ans: B

12. A subset H of a group G is a subgroup if:
    A.  H is closed under the group operation.
    B.  H contains the identity element of G, and for every $a \in H$, $a^{-1} \in H$.
    C.  H is closed under the group operation, contains the identity of G, and for every $a \in H$, $a^{-1} \in H$.
    D.  H is non-empty and closed under the group operation and taking inverses.
    E.  Both C and D are equivalent and correct.
    ans: E

13. The set $b\mathbb{Z} = \{n \in \mathbb{Z} \mid n = bk \text{ for some } k \in \mathbb{Z}\}$ is a subgroup of:
    A.  $\mathbb{Z}$ under multiplication.
    B.  $\mathbb{R}$ under addition.
    C.  $\mathbb{Z}$ under addition.
    D.  $GL_2(\mathbb{R})$.
    E.  $S_b$.
    ans: C

14. The subgroup generated by two integers a and b, $a\mathbb{Z} + b\mathbb{Z}$, is equal to $d\mathbb{Z}$ where d is:
    A.  $a+b$
    B.  $ab$
    C.  The least common multiple of a and b.
    D.  The greatest common divisor (gcd) of a and b.
    E.  $|a-b|$
    ans: D

15. The cyclic subgroup generated by an element x in a group G is:
    A.  $\{1, x\}$
    B.  $\{x, x^{-1}\}$
    C.  $\{x^n \mid n \in \mathbb{Z}\}$
    D.  $\{x^n \mid n \in \mathbb{N}\}$
    E.  The set of all elements that commute with x.
    ans: C

16. The order of an element x in a group G is:
    A.  The number of elements in G.
    B.  The smallest positive integer m such that $x^m = 1$ (the identity).
    C.  The largest integer m such that $x^m \ne 1$.
    D.  Always infinite.
    E.  The number of subgroups G has.
    ans: B

17. An isomorphism $\phi: G \to G'$ between two groups G and G' is a map such that:
    A.  $\phi$ is injective and $\phi(ab) = \phi(a)\phi(b)$.
    B.  $\phi$ is surjective and $\phi(ab) = \phi(a)\phi(b)$.
    C.  $\phi$ is bijective and $\phi(ab) = \phi(a)\phi(b)$.
    D.  $\phi(a+b) = \phi(a) + \phi(b)$ and $\phi$ is bijective.
    E.  $\phi$ preserves the order of elements.
    ans: C

18. An automorphism of a group G is:
    A.  A homomorphism from G to G.
    B.  An isomorphism from G to some other group G'.
    C.  An isomorphism from G to G itself.
    D.  A surjective homomorphism from G to G.
    E.  Any function from G to G.
    ans: C

19. Conjugation by an element b in a group G is the map $\phi_b(x) = bxb^{-1}$. This map is:
    A.  Always the identity map.
    B.  A homomorphism but not always an isomorphism.
    C.  An automorphism of G.
    D.  Not necessarily a homomorphism.
    E.  An isomorphism to a different group.
    ans: C

20. Two elements a, a' in a group G are conjugate if:
    A.  $a = ba'b^{-1}$ for some $b \in G$.
    B.  $aa' = a'a$.
    C.  $a' = a^{-1}$.
    D.  They have the same order.
    E.  They generate the same cyclic subgroup.
    ans: A

21. A homomorphism $\phi: G \to G'$ is a map such that for all a, b ∈ G:
    A.  $\phi(ab) = \phi(b)\phi(a)$
    B.  $\phi(ab) = \phi(a)\phi(b)$
    C.  $\phi(a+b) = \phi(a) + \phi(b)$
    D.  $\phi(a) = \phi(b)$ implies $a=b$
    E.  $\phi(G) = G'$
    ans: B

22. If $\phi: G \to G'$ is a group homomorphism, then $\phi(1_G)$ (where $1_G$ is the identity in G) is:
    A.  $1_{G'}$ (the identity in G').
    B.  Always different from $1_{G'}$.
    C.  An arbitrary element in G'.
    D.  An element of order 2 in G'.
    E.  Undefined unless $\phi$ is surjective.
    ans: A

23. The kernel of a homomorphism $\phi: G \to G'$ (ker $\phi$) is defined as:
    A.  $\{x \in G \mid \phi(x) = x\}$
    B.  $\{y \in G' \mid \phi(x) = y \text{ for some } x \in G\}$
    C.  $\{x \in G \mid \phi(x) = 1_{G'}\}$
    D.  $\{y \in G' \mid \phi(1_G) = y\}$
    E.  The set G itself.
    ans: C

24. A subgroup N of a group G is called a normal subgroup if for every $n \in N$ and every $g \in G$:
    A.  $gng^{-1} \in N$
    B.  $gn = ng$
    C.  $gN = N$
    D.  $N$ is abelian.
    E.  $gng^{-1} = n$
    ans: A

25. The kernel of any group homomorphism $\phi: G \to G'$ is always:
    A.  An abelian subgroup of G.
    B.  A normal subgroup of G.
    C.  The trivial subgroup {1}.
    D.  Isomorphic to G'.
    E.  A cyclic subgroup of G.
    ans: B

26. The center Z(G) of a group G is the set $\{z \in G \mid zx = xz \text{ for all } x \in G\}$. Z(G) is:
    A.  Always trivial.
    B.  Not necessarily a subgroup.
    C.  A normal subgroup of G.
    D.  The entire group G only if G is abelian.
    E.  Both C and D are true.
    ans: E

27. An equivalence relation on a set S must be:
    A.  Reflexive, symmetric, and associative.
    B.  Reflexive, symmetric, and transitive.
    C.  Reflexive, transitive, and commutative.
    D.  Symmetric, transitive, and distributive.
    E.  A bijective mapping.
    ans: B

28. If $\phi: G \to G'$ is a homomorphism, the relation $a \equiv b$ if $\phi(a) = \phi(b)$ is an equivalence relation. The equivalence classes are:
    A.  Subgroups of G.
    B.  Subgroups of G'.
    C.  The left cosets of ker $\phi$.
    D.  The right cosets of im $\phi$.
    E.  Always singletons.
    ans: C

29. A left coset of a subgroup H in a group G is a set of the form:
    A.  $\{ha \mid h \in H\}$ for some $a \in G$.
    B.  $\{ah \mid h \in H\}$ for some $a \in G$.
    C.  $\{h_1h_2 \mid h_1, h_2 \in H\}$.
    D.  $\{x \in G \mid xH = Hx\}$.
    E.  $H$ itself only.
    ans: B

30. The index of a subgroup H in G, denoted [G:H], is:
    A.  The order of H divided by the order of G.
    B.  The number of distinct left cosets of H in G.
    C.  The order of G minus the order of H.
    D.  The number of elements in H.
    E.  Always 2 if H is normal.
    ans: B

31. Lagrange's Theorem states that if G is a finite group and H is a subgroup of G, then:
    A.  The order of H divides the order of G.
    B.  The order of G divides the order of H.
    C.  $|G| = |H| + [G:H]$.
    D.  H must be a normal subgroup.
    E.  G must be cyclic if H is cyclic.
    ans: A

32. A consequence of Lagrange's Theorem is that the order of any element of a finite group G:
    A.  Must be equal to the order of G.
    B.  Must be a prime number.
    C.  Must divide the order of G.
    D.  Can be any integer.
    E.  Must be less than or equal to [G:H] for any subgroup H.
    ans: C

33. If a group G has prime order p, then G is:
    A.  Abelian but not necessarily cyclic.
    B.  Cyclic.
    C.  Non-abelian.
    D.  Isomorphic to $S_p$.
    E.  Has no proper subgroups.
    ans: B (and also E as a consequence, but B is more specific about structure)

34. For a homomorphism $\phi: G \to G'$, the Counting Formula states $|G| = |ker \phi| \cdot |im \phi|$ when G is finite. This implies:
    A.  $|ker \phi|$ divides $|im \phi|$.
    B.  $|im \phi|$ divides $|G'|$.
    C.  $|ker \phi|$ divides $|G|$.
    D.  Both B and C are true.
    E.  $|G| = |ker \phi| + |im \phi|$.
    ans: D

35. A subgroup H of G is normal if and only if:
    A.  Every left coset aH is equal to some right coset Hb (not necessarily Ha).
    B.  Every left coset aH is equal to the right coset Ha.
    C.  H is abelian.
    D.  H is cyclic.
    E.  The index [G:H] is 2.
    ans: B

36. The intersection $K \cap H$ of two subgroups K and H of G is:
    A.  Always a normal subgroup of G.
    B.  Not necessarily a subgroup.
    C.  A subgroup of G.
    D.  The trivial subgroup, unless K=H.
    E.  The union of K and H.
    ans: C

37. The product group $G \times G'$ has elements $(a, a')$ where $a \in G, a' \in G'$. The operation is:
    A.  $(a, a') \cdot (b, b') = (ab, a'b')$
    B.  $(a, a') \cdot (b, b') = (ab', ba')$
    C.  $(a, a') \cdot (b, b') = (a+b, a'+b')$
    D.  $(a, a') \cdot (b, b') = (aa', bb')$
    E.  Defined only if G and G' are abelian.
    ans: A

38. A cyclic group of order 6 is isomorphic to:
    A.  $S_3$
    B.  $\mathbb{Z}_2 \times \mathbb{Z}_3$
    C.  $\mathbb{Z}_6$ under multiplication modulo 6.
    D.  The quaternion group.
    E.  $\mathbb{Z}_2 \times \mathbb{Z}_2 \times \mathbb{Z}_2$
    ans: B

39. Two integers a and b are congruent modulo n, $a \equiv b \pmod{n}$, if:
    A.  $a - b = n$.
    B.  $n$ divides $a - b$.
    C.  $a/n = b/n$.
    D.  $a$ and $b$ have the same remainder when divided by $n$.
    E.  Both B and D are equivalent.
    ans: E

40. The set of congruence classes modulo n, $\mathbb{Z}/n\mathbb{Z}$, forms a group under:
    A.  Multiplication modulo n.
    B.  Addition modulo n.
    C.  The greatest common divisor operation.
    D.  It does not always form a group.
    E.  Composition of functions.
    ans: B

41. For a normal subgroup N of G, the elements of the quotient group G/N are:
    A.  The elements of N.
    B.  The elements of G not in N.
    C.  The left cosets of N in G.
    D.  Pairs (g, n) where $g \in G, n \in N$.
    E.  The homomorphisms from G to N.
    ans: C

42. The operation in the quotient group G/N is defined by $(aN)(bN) =$:
    A.  $abN$
    B.  $aNbN$
    C.  $(ab)^{-1}N$
    D.  $baN$
    E.  $N$
    ans: A

43. The First Isomorphism Theorem states that if $\phi: G \to G'$ is a surjective group homomorphism with kernel N, then:
    A.  $G/N \approx G'$
    B.  $G/G' \approx N$
    C.  $N/G \approx G'$
    D.  $G \approx N \times G'$
    E.  $G' \approx N$
    ans: A

44. Every normal subgroup N of a group G can be realized as:
    A.  The center of some group.
    B.  An abelian group.
    C.  A cyclic group.
    D.  The kernel of some homomorphism from G.
    E.  A group of prime order.
    ans: D

45. Consider the multiplication table for a group of order 3 with elements {e, a, b} where e is identity.
    If $a^2=b$, what is $ab$?
    <!-- Image placeholder: ![](./images/ch2_q45_mult_table.png) (imagine a 3x3 table) -->
    A.  e
    B.  a
    C.  b
    D.  Cannot be determined
    E.  $a^3$
    ans: A (Since it's order 3, it's cyclic, $a^3=e$. Then $ab = a \cdot a^2 = a^3 = e$)

46. If H and K are subgroups of G, and H is normal in G, then the set HK = {hk | h ∈ H, k ∈ K} is:
    A.  Always equal to KH.
    B.  A subgroup of G.
    C.  A normal subgroup of G.
    D.  Both A and B are true.
    E.  Not necessarily a subgroup.
    ans: D

47. The order of the product group $\mathbb{Z}_m \times \mathbb{Z}_n$ is:
    A. $m+n$
    B. $mn$
    C. lcm(m,n)
    D. gcd(m,n)
    E. $m^n$
    ans: B

48. Let $\phi: G \to G'$ be a homomorphism. If $H'$ is a subgroup of $G'$, then its inverse image $\phi^{-1}(H') = \{x \in G \mid \phi(x) \in H'\}$ is:
    A. Always the kernel of $\phi$.
    B. A subgroup of $G$.
    C. A subgroup of $G'$.
    D. Not necessarily a subgroup.
    E. Equal to $H'$ if $\phi$ is surjective.
    ans: B

### Chapter 3: Vector Spaces

1.  In the context of R^n, vector addition (a1,..., an) + (b1,..., bn) is defined as:
    A.  (a1b1, ..., anbn)
    B.  (a1+b1, ..., an+bn)
    C.  (a1-b1, ..., an-bn)
    D.  A scalar value representing the sum of all components
    E.  Undefined unless n=1
    ans: B

2.  A nonempty subset W of R^n is called a subspace if it is closed under which operations?
    A.  Vector addition only
    B.  Scalar multiplication only
    C.  Vector addition and scalar multiplication
    D.  Dot product and cross product
    E.  Matrix multiplication
    ans: C

3.  Which of the following is NOT a type of subspace of R^2 as described in Example (1.2)?
    A.  The zero vector alone: W = {0}
    B.  Vectors lying on a line L through the origin
    C.  The whole space: W = R^2
    D.  Vectors lying on a line L NOT through the origin
    E.  All listed are valid subspace types.
    ans: D

4.  According to Definition (1.6), for a real vector space V, addition (v, w) ↦ v + w must make V into:
    A.  A group
    B.  An abelian group (V+)
    C.  A field
    D.  A ring
    E.  A semigroup
    ans: B

5.  Which of the following is an axiom for a real vector space V regarding scalar multiplication (Definition 1.6)?
    A.  (ab)v = a + bv
    B.  1v = 0_V (the zero vector)
    C.  (a+b)v = av + bv
    D.  a(bv) = (ab) + v
    E.  cv = v for all scalars c
    ans: C

6.  Proposition (1.7) states that for any vector v in a vector space V and any scalar c in R:
    A.  0_R * v = v
    B.  c * 0_V = v
    C.  (-1)v = v
    D.  c * 0_V = 0_V
    E.  0_R * v = 1
    ans: D

7.  The set of all real polynomials p(x) forms a vector space under standard polynomial addition and scalar multiplication. What is the zero vector in this space?
    A.  The polynomial p(x) = 1
    B.  The polynomial p(x) = x
    C.  The polynomial p(x) = 0 (the zero polynomial)
    D.  The number 0
    E.  There is no zero vector.
    ans: C

8.  A subfield F of C (complex numbers) must satisfy which of the following according to (2.1)?
    A.  If a ∈ F, then √a ∈ F.
    B.  If a ∈ F and a ≠ 0, then a⁻¹ ∈ F.
    C.  F must be a finite set.
    D.  F must contain i (the imaginary unit).
    E.  0 is not an element of F.
    ans: B

9.  According to Definition (2.3), a field F requires that F^x = F - {0} forms a group under:
    A.  Addition
    B.  Multiplication
    C.  Subtraction
    D.  Division
    E.  Composition
    ans: B

10. The set Z/pZ of congruence classes modulo p forms a field (denoted F_p) if and only if:
    A.  p is any integer
    B.  p is an even integer
    C.  p is an odd integer
    D.  p is a prime integer
    E.  p is a composite integer
    ans: D

11. The cancellation law in F_p (Lemma 2.7) states that if ac = ad and a ≠ 0 in F_p, then:
    A.  c = d or a = 1
    B.  c = d
    C.  a = 0
    D.  c = -d
    E.  c = d⁻¹
    ans: B

12. A field F is said to have characteristic p if p is the smallest positive integer such that:
    A.  p * a = 0 for all a in F
    B.  a^p = a for all a in F
    C.  1 + 1 + ... + 1 (p terms) = 0 in F
    D.  The field F has p elements.
    E.  Every element has multiplicative order p.
    ans: C

13. An isomorphism φ from a vector space V to V' (both over field F) is a bijective map satisfying φ(cv) = cφ(v) and:
    A.  φ(v + v') = φ(v)φ(v')
    B.  φ(v + v') = φ(v) + φ(v')
    C.  φ(vv') = φ(v) + φ(v')
    D.  φ(v + v') = φ(v) - φ(v')
    E.  φ(c+v) = c + φ(v)
    ans: B

14. A linear combination of an ordered set of vectors (v1, ..., vn) is defined as:
    A.  A sum c1v1 + ... + cnvn, where ci ∈ F
    B.  A product c1v1 * ... * cnvn, where ci ∈ F
    C.  The set {v1, ..., vn} itself
    D.  The vector (c1, ..., cn)
    E.  The average (v1 + ... + vn)/n
    ans: A

15. The span of a set S of vectors, denoted Span S, is:
    A.  The set S itself.
    B.  The largest subspace contained within S.
    C.  The set of all vectors that can be added to S.
    D.  The smallest subspace of V which contains S.
    E.  The set of vectors orthogonal to S.
    ans: D

16. An ordered set of vectors (v1, ..., vn) is linearly independent if the equation c1v1 + ... + cnvn = 0_V implies:
    A.  At least one ci is non-zero.
    B.  All ci are equal to 1.
    C.  c1 = c2 = ... = cn = 0.
    D.  The sum of ci is zero.
    E.  The vectors form a basis.
    ans: C

17. A set of two vectors (v1, v2) is linearly dependent if and only if:
    A.  v1 = v2
    B.  v1 = -v2
    C.  Either v1 = 0_V, or v2 is a multiple of v1 (or v2 = 0_V, or v1 is a multiple of v2).
    D.  Both v1 and v2 are non-zero.
    E.  Their dot product is zero.
    ans: C

18. A set of vectors B = (v1, ..., vn) is a basis for a vector space V if:
    A.  B spans V and the vectors are all non-zero.
    B.  B is linearly independent and V is finite-dimensional.
    C.  B is linearly independent and B spans V.
    D.  Every vector in V is a unique scalar multiple of some vector in B.
    E.  The number of vectors in B is less than dim(V).
    ans: C

19. According to Proposition (3.8), a set B = (v1, ..., vn) is a basis if and only if every vector w ∈ V can be written in the form c1v1 + ... + cnvn:
    A.  In at least one way
    B.  In at most one way
    C.  In exactly one way (uniquely)
    D.  If all ci are positive
    E.  If w is not the zero vector
    ans: C

20. The standard basis for F^n consists of vectors ei where ei has:
    A.  All entries equal to 1.
    B.  1 in the i-th position and zeros elsewhere.
    C.  i in the i-th position and zeros elsewhere.
    D.  1s up to the i-th position and zeros after.
    E.  Alternating 1s and 0s.
    ans: B

21. A vector space V is called finite-dimensional if (Definition 3.12):
    A.  It contains a finite number of vectors.
    B.  There is some finite set S which spans V.
    C.  Every basis for V is finite.
    D.  It is a subspace of R^n for some n.
    E.  It has no infinite linearly independent sets.
    ans: B

22. If S is a finite set that spans a vector space V, then (Proposition 3.13):
    A.  S is necessarily a basis.
    B.  S contains a basis of V.
    C.  Every subset of S is linearly independent.
    D.  V must be R^n.
    E.  S cannot be linearly dependent.
    ans: B

23. If L is a linearly independent set in a finite-dimensional vector space V, then (Proposition 3.15):
    A.  L is already a basis.
    B.  L can be extended by adding elements to get a basis.
    C.  L must span V.
    D.  Any set containing L is also linearly independent.
    E.  |L| > dim V.
    ans: B

24. If S spans V and L is a linearly independent subset of V, then (Proposition 3.16):
    A.  |S| < |L|
    B.  |S| = |L|
    C.  |S| ≥ |L|
    D.  |S| and |L| are unrelated.
    E.  S must be equal to L.
    ans: C

25. The dimension of a finite-dimensional vector space V, denoted dim V, is defined as:
    A.  The number of elements in any spanning set.
    B.  The maximum size of a linearly independent set.
    C.  The number of vectors in a basis for V.
    D.  The number of subspaces of V.
    E.  The size of the field F over which V is defined.
    ans: C

26. If W is a subspace of a finite-dimensional vector space V, then (Proposition 3.20):
    A.  dim W > dim V
    B.  dim W = dim V always
    C.  dim W ≤ dim V, and dim W = dim V only if W = V
    D.  dim W is unrelated to dim V
    E.  W must be {0_V} or V.
    ans: C

27. If B = (v1, ..., vn) is a basis for F^n, and [B] is the matrix whose columns are v1, ..., vn, then a vector Y ∈ F^n has coordinate vector X with respect to B given by:
    A.  X = [B]Y
    B.  X = Y[B]⁻¹
    C.  X = [B]⁻¹Y
    D.  Y = X[B]⁻¹
    E.  X = Y
    ans: C

28. The columns of an n x n matrix A with entries in a field F form a basis of F^n if and only if (Proposition 4.8):
    A.  det(A) = 0
    B.  A is a symmetric matrix
    C.  A is invertible
    D.  A has no zero entries
    E.  A is an upper triangular matrix
    ans: C

29. Corollary (4.15) states that every vector space V of dimension n over a field F is isomorphic to:
    A.  F itself
    B.  F^(n-1)
    C.  F^n (the space of column vectors)
    D.  The set of n x n matrices over F
    E.  P_n(F) (polynomials of degree at most n)
    ans: C

30. If B is the old basis and B' is the new basis for a vector space V, the matrix of change of basis P is defined by the relation (page 98, (4.16)):
    A.  B' = BP
    B.  B = B'P
    C.  P = BB'
    D.  P = B'B⁻¹
    E.  B' = PB
    ans: B

31. If X is the coordinate vector of v with respect to old basis B, and X' is the coordinate vector of v with respect to new basis B' (where B = B'P), then:
    A.  X = PX'
    B.  X' = P⁻¹X
    C.  X' = XP
    D.  X' = PX
    E.  X = X'
    ans: D

32. If the old basis is the standard basis E for F^n, and the new basis is B', then the change of basis matrix P (such that E = B'P) is (page 99, (4.20)):
    A.  P = [B']
    B.  P = [B']⁻¹
    C.  P = I (identity matrix)
    D.  P = [B']^T
    E.  P is undefined.
    ans: B

33. The order of the general linear group GL2(F_p) is (Corollary 4.24):
    A.  p²
    B.  p(p-1)
    C.  (p²-1)(p²-p)
    D.  p² + 1
    E.  (p-1)²
    ans: C

34. An infinite-dimensional vector space is one that:
    A.  Contains an infinite number of vectors.
    B.  Is defined over an infinite field.
    C.  Is not spanned by any finite set of vectors.
    D.  Has at least one basis vector that is an infinite sequence.
    E.  Contains R^infinity as a subspace.
    ans: C

35. The span of an infinite set S of vectors is defined as:
    A.  The set of all infinite linear combinations of vectors from S.
    B.  The set of all finite linear combinations of vectors from S.
    C.  S itself, if S is uncountable.
    D.  The largest vector space contained in S.
    E.  The set of all limits of sequences of linear combinations from S.
    ans: B

36. The set Z of sequences with finitely many non-zero terms (e.g., (a1, a2, ..., ak, 0, 0, ...)) has a basis consisting of e_i where e_i has 1 in the i-th position and 0 elsewhere. This basis is:
    A.  Finite
    B.  Countably infinite
    C.  Uncountably infinite
    D.  The empty set
    E.  Not well-defined
    ans: B

37. According to Proposition (5.7), if V is a finite-dimensional vector space:
    A.  It may have an infinite basis.
    B.  Every basis of V is finite.
    C.  It must be a subspace of R^infinity.
    D.  Any spanning set must be infinite.
    E.  Any linearly independent set must be finite, but may not extend to a basis.
    ans: B

38. The sum of subspaces W1, ..., Wn, denoted W1 + ... + Wn, is:
    A.  The intersection of all Wi.
    B.  The set {w1 + ... + wn | wi ∈ Wi}.
    C.  The union of all Wi.
    D.  The subspace spanned by the union of bases of Wi.
    E.  The set of all vectors common to all Wi.
    ans: B

39. Subspaces W1, ..., Wn are called independent if w1 + ... + wn = 0_V (with wi ∈ Wi) implies:
    A.  At least one wi = 0_V.
    B.  The sum of wi is not necessarily zero.
    C.  All wi = 0_V.
    D.  All Wi are orthogonal to each other.
    E.  The dimensions of Wi are all equal.
    ans: C

40. A vector space V is the direct sum of its subspaces W1, ..., Wn (V = W1 ⊕ ... ⊕ Wn) if V = W1 + ... + Wn and:
    A.  The intersection of all Wi is {0_V}.
    B.  The subspaces W1, ..., Wn are independent.
    C.  Each Wi is one-dimensional.
    D.  The union of Wi is V.
    E.  dim V = Σ dim Wi / n.
    ans: B

41. Two subspaces W1, W2 are independent if and only if (Proposition 6.5b):
    A.  W1 ∪ W2 = {0_V}
    B.  W1 + W2 = {0_V}
    C.  W1 ∩ W2 = {0_V}
    D.  W1 is a subset of W2 (or vice-versa)
    E.  dim W1 = dim W2
    ans: C

42. If W is a subspace of a finite-dimensional vector space V, Corollary (6.7) states that there exists another subspace W' such that:
    A.  V = W ∩ W'
    B.  V = W ∪ W'
    C.  V = W + W' but not necessarily a direct sum
    D.  V = W ⊕ W'
    E.  W' is a subspace of W
    ans: D

43. The dimension formula for the sum of two subspaces W1 and W2 (Proposition 6.9) is:
    A.  dim(W1 + W2) = dim W1 + dim W2 + dim(W1 ∩ W2)
    B.  dim(W1 + W2) = dim W1 + dim W2 - dim(W1 ∩ W2)
    C.  dim(W1 + W2) = max(dim W1, dim W2)
    D.  dim(W1 + W2) = dim W1 * dim W2 / dim(W1 ∩ W2)
    E.  dim(W1 + W2) = dim W1 + dim W2
    ans: B

44. The set of solutions to a system of homogeneous linear equations AX = 0, where A is an m x n matrix with entries from a field F, forms:
    A.  A field
    B.  A subspace of F^n
    C.  A subspace of F^m
    D.  The entire space F^n
    E.  A linearly independent set of vectors
    ans: B

45. The definition of scalar multiplication c * (a1,...,an) in R^n is:
    A.  (ca1, ..., can)
    B.  (c+a1, ..., c+an)
    C.  (a1/c, ..., an/c)
    D.  c * (a1+...+an)
    E.  ( (a1)^c, ..., (an)^c )
    ans: A

### Chapter 3: VECTOR SPACES

1.  Which of the following is NOT an axiom for a set V to be a vector space over a field F? (v, w ∈ V, c, d ∈ F)
    A.  $v + w = w + v$
    B.  $c(v + w) = cv + cw$
    C.  $1v = v$ (where 1 is the multiplicative identity in F)
    D.  If $cv = 0_V$, then $c=0_F$ or $v=0_V$.
    E.  $(c+d)v = cv + dv$
    ans: D

2.  In a vector space V over a field F, which of the following properties is a consequence of the axioms?
    A.  $0_F \cdot v = v$ for all $v \in V$
    B.  $c \cdot 0_V = 0_V$ for all $c \in F$
    C.  $(-1_F) \cdot v = v$ for all $v \in V$
    D.  If $v+w = v+u$, then $w$ might not be equal to $u$.
    E.  $c(dv) = (cd)v$ is only true if F is commutative.
    ans: B

3.  Let V be the set of all pairs of real numbers $(x, y)$ with addition defined as $(x_1, y_1) + (x_2, y_2) = (x_1+x_2, y_1+y_2)$ and scalar multiplication $c(x,y) = (cx, 0)$. Is V a vector space over R?
    A.  Yes, all axioms are satisfied.
    B.  No, because the scalar multiplication axiom $1v = v$ fails.
    C.  No, because closure under scalar multiplication fails.
    D.  No, because $(c+d)v = cv+dv$ fails.
    E.  No, because $c(dv) = (cd)v$ fails.
    ans: B

4.  Which of the following sets, with standard operations, is NOT a real vector space?
    A.  The set of all $2 \times 2$ matrices with real entries.
    B.  The set of all polynomials of degree exactly 3 with real coefficients.
    C.  The set of all continuous real-valued functions defined on [0, 1].
    D.  The set of all vectors $(x,y,z) \in \mathbb{R}^3$ such that $x+y+z=0$.
    E.  The set $\mathbb{R}^n$.
    ans: B

5.  A subset W of a vector space V is a subspace if and only if:
    A.  W is non-empty, closed under addition, and closed under scalar multiplication.
    B.  W contains the zero vector.
    C.  W is closed under addition and scalar multiplication.
    D.  W is non-empty and for any $v, w \in W$ and any scalar c, $cv+w \in W$.
    E.  Both A and D are equivalent conditions for W to be a subspace (assuming W is a subset of V).
    ans: E

6.  Consider $\mathbb{R}^2$. Which of the following is NOT a subspace of $\mathbb{R}^2$?
    A.  $\{(0,0)\}$
    B.  $\{(x,y) | y = 2x\}$
    C.  $\{(x,y) | x \ge 0, y \ge 0\}$ (the first quadrant)
    D.  $\mathbb{R}^2$ itself
    E.  $\{(x,y) | x = 0\}$ (the y-axis)
    ans: C

7.  The set of solutions to a system of homogeneous linear equations $AX = 0$ (where A is an $m \times n$ matrix and X is an $n \times 1$ column vector) forms a:
    A.  Subspace of $\mathbb{R}^m$
    B.  Subspace of $\mathbb{R}^n$
    C.  Field
    D.  Basis for $\mathbb{R}^n$
    E.  Set that is not necessarily closed under addition.
    ans: B

8.  Which of the following is NOT a field?
    A.  $\mathbb{R}$ (real numbers)
    B.  $\mathbb{Q}$ (rational numbers)
    C.  $\mathbb{Z}$ (integers)
    D.  $\mathbb{F}_5$ (integers modulo 5)
    E.  $\mathbb{C}$ (complex numbers)
    ans: C

9.  What is the characteristic of the field $\mathbb{F}_7$ (integers modulo 7)?
    A.  0
    B.  1
    C.  7
    D.  6
    E.  Infinite
    ans: C

10. Let V be a vector space over a field F. A linear combination of vectors $v_1, ..., v_k \in V$ is an expression of the form:
    A.  $c_1 v_1 + ... + c_k v_k$, where $c_i \in F$.
    B.  $v_1 + ... + v_k$.
    C.  $c(v_1 + ... + v_k)$, where $c \in F$.
    D.  The set of all sums of scalar multiples of $v_1, ..., v_k$.
    E.  A product $v_1 v_2 ... v_k$.
    ans: A

11. The span of a set of vectors $S = \{v_1, ..., v_k\}$ in a vector space V is:
    A.  The set S itself.
    B.  The set of all scalar multiples of vectors in S.
    C.  The set of all linear combinations of vectors in S.
    D.  The largest subspace of V.
    E.  A linearly independent set containing S.
    ans: C

12. A set of vectors $\{v_1, ..., v_k\}$ is linearly independent if the equation $c_1 v_1 + ... + c_k v_k = 0_V$:
    A.  Has at least one solution for $c_1, ..., c_k$.
    B.  Has a non-trivial solution (not all $c_i$ are zero).
    C.  Has only the trivial solution ($c_1 = c_2 = ... = c_k = 0_F$).
    D.  Implies that at least one vector is a linear combination of the others.
    E.  Means the vectors span the entire vector space.
    ans: C

13. Which of the following sets of vectors in $\mathbb{R}^3$ is linearly dependent?
    A.  $\{(1,0,0), (0,1,0), (0,0,1)\}$
    B.  $\{(1,1,0), (0,1,1)\}$
    C.  $\{(1,2,3), (2,4,6)\}$
    D.  $\{(1,0,0), (1,1,0), (1,1,1)\}$
    E.  The empty set.
    ans: C

14. A set $B = \{v_1, ..., v_n\}$ is a basis for a vector space V if:
    A.  B spans V.
    B.  B is linearly independent.
    C.  B spans V and is linearly independent.
    D.  Every vector in V can be written as a linear combination of vectors in B.
    E.  The number of vectors in B is equal to the dimension of V.
    ans: C

15. The dimension of a finite-dimensional vector space V is defined as:
    A.  The number of vectors in any spanning set for V.
    B.  The number of vectors in any linearly independent set in V.
    C.  The number of vectors in any basis for V.
    D.  The maximum number of linearly independent vectors in V.
    E.  Both C and D.
    ans: E

16. What is the dimension of the vector space of all $2 \times 2$ real matrices?
    A.  1
    B.  2
    C.  3
    D.  4
    E.  Infinite
    ans: D

17. If S is a set of 5 vectors that spans a vector space V, then the dimension of V:
    A.  Must be 5.
    B.  Must be greater than 5.
    C.  Must be less than 5.
    D.  Can be at most 5.
    E.  Cannot be determined.
    ans: D

18. If L is a linearly independent set of 3 vectors in a vector space V of dimension 5, then:
    A.  L must be a basis for V.
    B.  L can be extended to a basis for V by adding 2 more vectors.
    C.  V cannot have a basis with 5 vectors.
    D.  Any set of 4 vectors in V must be linearly dependent.
    E.  L must span V.
    ans: B

19. The zero vector space $\{0_V\}$ has:
    A.  Dimension 0 and its basis is $\{0_V\}$.
    B.  Dimension 0 and its basis is the empty set.
    C.  Dimension 1 and its basis is $\{0_V\}$.
    D.  Dimension 1 and its basis is the empty set.
    E.  No basis.
    ans: B

20. If W is a subspace of a finite-dimensional vector space V, then:
    A.  $dim(W) > dim(V)$
    B.  $dim(W) \le dim(V)$
    C.  $dim(W) = dim(V)$ only if $W = \{0_V\}$
    D.  $dim(W)$ can be unrelated to $dim(V)$
    E.  $dim(W) < dim(V)$ always.
    ans: B

21. Let $V = \mathbb{R}^3$ and let $B = \{(1,0,0), (0,1,0), (0,0,1)\}$ be the standard basis. The coordinate vector of $v = (3, -1, 2)$ with respect to B is:
    A.  $(3, -1, 2)^T$
    B.  $(1, 1, 1)^T$
    C.  $(3, 0, 0)^T$
    D.  Cannot be determined without more information.
    E.  $(0, -1, 0)^T$
    ans: A

22. Let $V = \mathbb{R}^2$ and let basis $B = \{(1,1), (1,-1)\}$. Find the coordinate vector of $Y=(2,4)$ with respect to B.
    A.  $(2,4)^T$
    B.  $(3,-1)^T$
    C.  $(1,1)^T$
    D.  $(2,0)^T$
    E.  $(3,1)^T$
    ans: B

23. The columns of an $n \times n$ matrix A form a basis for $\mathbb{F}^n$ if and only if:
    A.  A is symmetric.
    B.  det(A) = 0.
    C.  A is invertible.
    D.  A has a row of zeros.
    E.  A is an upper triangular matrix.
    ans: C

24. Let B and B' be two bases for a vector space V. If B = (v1, ..., vn) and B' = (v'1, ..., v'n), the change of basis matrix P from B to B' (such that coordinates transform as $X' = P^{-1}X$ or $X=PX'$, or basis vectors transform as B' = BP - check text for convention) is defined by the relation $B = B'P$. What does the j-th column of P represent?
    A.  The coordinates of $v'_j$ with respect to basis B.
    B.  The coordinates of $v_j$ with respect to basis B'.
    C.  The vector $v_j$.
    D.  The vector $v'_j$.
    E.  The inverse of the coordinates of $v_j$ with respect to B'.
    ans: B

25. Using the text's convention on page 98, $B = B'P$, and the coordinate vectors transform as $PX = X'$, where X are coordinates w.r.t. B (old) and X' are coordinates w.r.t. B' (new). If $P = \begin{pmatrix} 1 & 1 \\ 0 & 2 \end{pmatrix}$, and a vector $v$ has coordinates $X = \begin{pmatrix} 1 \\ 1 \end{pmatrix}$ w.r.t. B, what are its coordinates $X'$ w.r.t. B'?
    A.  $\begin{pmatrix} 1 \\ 1 \end{pmatrix}$
    B.  $\begin{pmatrix} 2 \\ 2 \end{pmatrix}$
    C.  $\begin{pmatrix} 0 \\ -1/2 \end{pmatrix}$
    D.  $\begin{pmatrix} 1 & -1/2 \\ 0 & 1/2 \end{pmatrix} \begin{pmatrix} 1 \\ 1 \end{pmatrix} = \begin{pmatrix} 1/2 \\ 1/2 \end{pmatrix}$
    E.  $\begin{pmatrix} 1 \\ 3 \end{pmatrix}$
    ans: B

26. If V is an n-dimensional vector space over a field F, then V is isomorphic to:
    A.  $\mathbb{F}^{n+1}$
    B.  $\mathbb{F}^n$
    C.  $\mathbb{F}^{n-1}$
    D.  The set of all $n \times n$ matrices over F.
    E.  The field F itself.
    ans: B

27. The vector space $\mathbb{R}^\infty$ of infinite sequences of real numbers $(a_1, a_2, a_3, ...)$ is:
    A.  Finite-dimensional with dimension equal to the number of terms.
    B.  Finite-dimensional with a basis like $\{e_i\}$ where $e_i$ has 1 in i-th pos and 0 elsewhere.
    C.  Infinite-dimensional.
    D.  Not a vector space.
    E.  Isomorphic to $\mathbb{R}^n$ for some large n.
    ans: C

28. The span of the infinite set of vectors $S = \{e_1, e_2, e_3, ...\}$ in $\mathbb{R}^\infty$ (where $e_i$ has 1 in the i-th position and 0s elsewhere) is:
    A.  $\mathbb{R}^\infty$ itself.
    B.  The set Z of sequences with finitely many non-zero terms.
    C.  The set of convergent sequences.
    D.  The set containing only $e_1, e_2, ...$.
    E.  The zero vector space.
    ans: B

29. A basis for an infinite-dimensional vector space:
    A.  Must be finite.
    B.  Must be countably infinite.
    C.  Can be uncountably infinite.
    D.  Does not exist.
    E.  Is defined as a finite set that generates all elements.
    ans: C

30. If $W_1$ and $W_2$ are subspaces of a vector space V, their sum $W_1 + W_2$ is defined as:
    A.  $\{w_1 + w_2 \mid w_1 \in W_1, w_2 \in W_2 \}$
    B.  $\{w \mid w \in W_1 \text{ or } w \in W_2 \}$
    C.  $W_1 \cap W_2$
    D.  $W_1 \cup W_2$
    E.  The set of all linear combinations from $W_1 \cup W_2$.
    ans: A

31. Subspaces $W_1, ..., W_k$ of V are called independent if $w_1 + ... + w_k = 0_V$ (with $w_i \in W_i$) implies:
    A.  At least one $w_i = 0_V$.
    B.  All $w_i$ are linearly dependent.
    C.  All $w_i = 0_V$.
    D.  The sum of dimensions of $W_i$ is 0.
    E.  The intersection of all $W_i$ is $\{0_V\}$.
    ans: C

32. A vector space V is the direct sum of its subspaces $W_1$ and $W_2$, denoted $V = W_1 \oplus W_2$, if $V = W_1 + W_2$ and:
    A.  $W_1 \subseteq W_2$
    B.  $W_2 \subseteq W_1$
    C.  $W_1 \cap W_2 = \{0_V\}$
    D.  $dim(W_1) = dim(W_2)$
    E.  $W_1$ and $W_2$ are isomorphic.
    ans: C

33. If $W_1$ and $W_2$ are subspaces of a finite-dimensional vector space V, then $dim(W_1 + W_2)$ equals:
    A.  $dim(W_1) + dim(W_2)$
    B.  $dim(W_1) + dim(W_2) - dim(W_1 \cap W_2)$
    C.  $dim(W_1) + dim(W_2) + dim(W_1 \cap W_2)$
    D.  $max(dim(W_1), dim(W_2))$
    E.  $|dim(W_1) - dim(W_2)|$
    ans: B

34. Let $V = \mathbb{R}^3$. Let $W_1 = span\{(1,0,0), (0,1,0)\}$ and $W_2 = span\{(0,0,1)\}$. Then $V = W_1 \oplus W_2$. What is $dim(W_1)$?
    A.  0
    B.  1
    C.  2
    D.  3
    E.  Cannot be determined.
    ans: C

35. The set of real polynomials $p(x) = a_n x^n + ... + a_0$ forms a vector space over $\mathbb{R}$. What is the dimension of the subspace of polynomials of degree at most 3?
    A.  1
    B.  2
    C.  3
    D.  4
    E.  Infinite
    ans: D

36. If V is a vector space and $v \in V$ such that $v \neq 0_V$. The set $\{v\}$ is:
    A.  Always linearly dependent.
    B.  Always linearly independent.
    C.  Linearly independent if $v$ is a basis vector.
    D.  Linearly dependent if $V$ is $\mathbb{R}^1$.
    E.  Neither linearly independent nor dependent.
    ans: B

37. Which statement is FALSE about a basis B of a finite-dimensional vector space V?
    A.  Every vector in V can be written as a unique linear combination of vectors in B.
    B.  B is a maximal linearly independent set in V.
    C.  B is a minimal spanning set for V.
    D.  B can contain the zero vector if V is the zero vector space.
    E.  Any two bases for V have the same number of vectors.
    ans: D

38. Let F be a field. The space $F^n$ of n-tuples is a vector space over F. What is its dimension?
    A.  1
    B.  n
    C.  $n^2$
    D.  Depends on the field F.
    E.  Infinite if F is infinite.
    ans: B

39. The inverse of the element $\bar{3}$ in the field $\mathbb{F}_{13}$ is:
    A.  $\bar{1}$
    B.  $\bar{3}$
    C.  $\bar{7}$
    D.  $\bar{9}$ (since $3 \times 9 = 27 \equiv 1 \pmod{13}$)
    E.  $\bar{10}$
    ans: D

40. Let V be the vector space of $2 \times 2$ symmetric matrices with real entries. A basis for V is:
    A.  $\left\{ \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 1 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix} \right\}$
    B.  $\left\{ \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix} \right\}$
    C.  $\left\{ \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix} \right\}$
    D.  $\left\{ \begin{pmatrix} 1 & a \\ a & 1 \end{pmatrix} \mid a \in \mathbb{R} \right\}$
    E.  $\left\{ \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix} \right\}$
    ans: B

41. Consider $V=\mathbb{R}^2$. Let $B = \{(1,0), (0,1)\}$ be the old basis and $B' = \{(1,1), (1,-1)\}$ be the new basis. The matrix P such that $B=B'P$ is:
    A.  $\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$
    B.  $\begin{pmatrix} 1/2 & 1/2 \\ 1/2 & -1/2 \end{pmatrix}$
    C.  $\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$
    D.  $\begin{pmatrix} 1 & 1 \\ 0 & -2 \end{pmatrix}$
    E.  $\begin{pmatrix} 1 & 0 \\ 1 & -1 \end{pmatrix}$
    ans: B

42. Let V be a vector space. The intersection of two subspaces $W_1$ and $W_2$ of V is:
    A.  Always empty.
    B.  Always a subspace of V.
    C.  A subspace of V only if $W_1 \subseteq W_2$ or $W_2 \subseteq W_1$.
    D.  Not necessarily closed under addition.
    E.  The set $W_1 \cup W_2$.
    ans: B

43. If $V=W_1 \oplus W_2$, and $v \in V$ is written as $v = w_1 + w_2$ with $w_1 \in W_1, w_2 \in W_2$. This representation is:
    A.  Unique.
    B.  Not necessarily unique.
    C.  Unique only if $W_1 = \{0_V\}$.
    D.  Unique only if $dim(V)$ is finite.
    E.  Never unique.
    ans: A

44. Let $P_2$ be the space of polynomials of degree at most 2. Which of the following sets is a basis for $P_2$?
    A.  $\{1, x\}$
    B.  $\{1, x, x^2, x^3\}$
    C.  $\{1+x, x+x^2, 1+x^2\}$
    D.  $\{x^2, 2x^2, 3x^2\}$
    E.  $\{1, x, x^2-1\}$
    ans: E

45. In $\mathbb{F}_2^3$, how many distinct vectors are there? (Note: $\mathbb{F}_2 = \{0,1\}$)
    A.  2
    B.  3
    C.  6
    D.  8
    E.  9
    ans: D

### Chapter 4: LINEAR TRANSFORMATIONS

1.  A map $T: V \to W$ between vector spaces $V$ and $W$ over a field $F$ is a linear transformation if, for all $v_1, v_2 \in V$ and all $c \in F$:
    A.  $T(v_1 + v_2) = T(v_1) + T(v_2)$ and $T(cv_1) = cT(v_1)$
    B.  $T(v_1 v_2) = T(v_1)T(v_2)$ and $T(c+v_1) = c+T(v_1)$
    C.  $T(cv_1 + v_2) = cT(v_1) - T(v_2)$
    D.  $T$ is injective and surjective
    E.  $V$ and $W$ have the same dimension
    ans: A

2.  If $T: V \to W$ is a linear transformation, then the kernel of T, denoted $\ker T$, is defined as:
    A.  $\{w \in W \mid w = T(v) \text{ for some } v \in V\}$
    B.  $\{v \in V \mid T(v) = 0_W\}$
    C.  $\{v \in V \mid T(v) = v\}$
    D.  $\{w \in W \mid T(0_V) = w\}$
    E.  The set of all vectors $v \in V$ such that $T(v) \neq 0_W$
    ans: B

3.  The dimension formula for a linear transformation $T: V \to W$ (where $V$ is finite-dimensional) states:
    A.  $\dim V = \dim(\ker T) \cdot \dim(\text{im } T)$
    B.  $\dim V = \dim(\ker T) - \dim(\text{im } T)$
    C.  $\dim W = \dim(\ker T) + \dim(\text{im } T)$
    D.  $\dim V = \dim(\ker T) + \dim(\text{im } T)$
    E.  $\dim V = \text{rank}(T) - \text{nullity}(T)$
    ans: D

4.  Let $T: P_n \to P_{n-1}$ be the differentiation operator $T(p(x)) = \frac{d}{dx}p(x)$. The nullity of $T$ is:
    A.  0
    B.  1
    C.  n
    D.  n-1
    E.  n+1
    ans: B

5.  If $A$ is an $m \times n$ matrix representing a linear transformation $T: F^n \to F^m$ by $T(X) = AX$. The image of $T$ is:
    A.  The null space of $A$
    B.  The column space of $A$
    C.  The row space of $A$
    D.  $F^n$
    E.  The set of solutions to $AX=0$
    ans: B

6.  Let $T: V \to W$ be a linear transformation, with $B = (v_1, \dots, v_n)$ a basis for $V$ and $C = (w_1, \dots, w_m)$ a basis for $W$. The matrix $A$ of $T$ with respect to bases $B$ and $C$ is defined such that its $j$-th column is:
    A.  The coordinate vector of $v_j$ with respect to $C$
    B.  The coordinate vector of $T(v_j)$ with respect to $C$
    C.  The coordinate vector of $w_j$ with respect to $B$
    D.  The coordinate vector of $T(w_j)$ with respect to $B$
    E.  $T(v_j)$ itself
    ans: B

7.  If $A$ is the matrix of $T: V \to W$ with respect to bases $B_V, B_W$, and $A'$ is the matrix of $T$ with respect to new bases $B'_V, B'_W$. If $P$ is the change-of-basis matrix from $B'_V$ to $B_V$ (i.e., $X_V = PX'_V$) and $Q$ is the change-of-basis matrix from $B'_W$ to $B_W$ (i.e., $X_W = QX'_W$), then:
    A.  $A' = PAQ^{-1}$
    B.  $A' = P^{-1}AQ$
    C.  $A' = QAP^{-1}$
    D.  $A' = Q^{-1}AP$
    E.  $A' = P^T A Q$
    ans: D

8.  For any linear transformation $T: V \to W$ between finite-dimensional vector spaces, bases $B$ for $V$ and $C$ for $W$ can be chosen such that the matrix of $T$ has the form:
    A.  An identity matrix
    B.  A diagonal matrix
    C.  $\begin{pmatrix} I_r & 0 \\ 0 & 0 \end{pmatrix}$, where $r = \text{rank}(T)$
    D.  An upper triangular matrix
    E.  A zero matrix
    ans: C

9.  A linear operator $T: V \to V$. If $A$ is the matrix of $T$ with respect to basis $B$, and $A'$ is the matrix of $T$ with respect to a new basis $B'$, with $P$ being the change-of-basis matrix from $B'$ to $B$, then:
    A.  $A' = P A P^{-1}$
    B.  $A' = P^{-1} A P$
    C.  $A' = P A P^T$
    D.  $A' = A$
    E.  $A' = Q A P^{-1}$ for some Q
    ans: B

10. Two square matrices $A$ and $A'$ are called similar if:
    A.  $A' = PAP^{-1}$ for some invertible matrix $P$
    B.  $A' = A^T$
    C.  $\det(A) = \det(A')$
    D.  They have the same eigenvectors
    E.  $A' = PAQ$ for invertible $P, Q$
    ans: A

11. A subspace $W$ of $V$ is $T$-invariant under a linear operator $T: V \to V$ if:
    A.  $T(w) = w$ for all $w \in W$
    B.  $T(w) = 0$ for all $w \in W$
    C.  $T(W) \subseteq W$
    D.  $T(W) = V$
    E.  $W \subseteq \ker(T)$
    ans: C

12. If $W$ is a $T$-invariant subspace of $V$, and a basis for $V$ is chosen by extending a basis for $W$, the matrix of $T$ with respect to this basis has the block form:
    A.  $\begin{pmatrix} A & 0 \\ B & D \end{pmatrix}$
    B.  $\begin{pmatrix} A & B \\ 0 & D \end{pmatrix}$
    C.  $\begin{pmatrix} A & B \\ C & 0 \end{pmatrix}$
    D.  A diagonal matrix
    E.  $\begin{pmatrix} 0 & B \\ C & D \end{pmatrix}$
    ans: B

13. An eigenvector $v$ of a linear operator $T$ is a non-zero vector such that:
    A.  $T(v) = 0$
    B.  $T(v) = v$
    C.  $T(v) = cv$ for some scalar $c$
    D.  $T(cv) = v$ for some scalar $c$
    E.  $T(v)$ is orthogonal to $v$
    ans: C

14. If $A$ and $B$ are similar matrices, which of the following is NOT necessarily true?
    A.  $\det(A) = \det(B)$
    B.  $\text{tr}(A) = \text{tr}(B)$
    C.  $A$ and $B$ have the same characteristic polynomial
    D.  $A$ and $B$ have the same eigenvalues
    E.  $A$ and $B$ have the same eigenvectors
    ans: E

15. A real $n \times n$ matrix $A$ with all positive entries has an eigenvector $v$ with all positive entries. This eigenvalue is:
    A.  Always 0
    B.  Always negative
    C.  The eigenvalue with the largest absolute value (Perron-Frobenius theorem context)
    D.  Always 1
    E.  Purely imaginary
    ans: C

16. For a linear operator $T: V \to V$ on a finite-dimensional space, $0$ is an eigenvalue of $T$ if and only if:
    A.  $T$ is surjective
    B.  $\det(A) \neq 0$, where $A$ is a matrix of $T$
    C.  $\ker T = \{0\}$
    D.  $T$ is singular
    E.  $T$ is the identity operator
    ans: D

17. The characteristic polynomial of a linear operator $T$ (represented by matrix $A$) is defined as:
    A.  $\det(A + tI)$
    B.  $\det(tA - I)$
    C.  $\det(tI - A)$
    D.  The minimal polynomial of $A$
    E.  A polynomial whose roots are the diagonal entries of $A$
    ans: C

18. The eigenvalues of a linear operator $T$ are:
    A.  The coefficients of its characteristic polynomial
    B.  The roots of its characteristic polynomial
    C.  The diagonal entries of any matrix representing $T$
    D.  Always real numbers
    E.  The basis vectors for which $T(v)=0$
    ans: B

19. The characteristic polynomial of an $n \times n$ matrix $A$ is $p(t) = t^n - (\text{tr } A)t^{n-1} + \dots + (-1)^n (\det A)$. This statement is:
    A.  True
    B.  False, the sign of $\det A$ term is always positive
    C.  False, the trace term has a positive sign
    D.  True only if A is diagonalizable
    E.  True only if A is symmetric
    ans: A

20. Over the field of complex numbers, any linear operator $T: V \to V$ on a non-zero finite-dimensional vector space $V$:
    A.  Has no eigenvalues
    B.  Has at least one eigenvalue
    C.  Has only real eigenvalues
    D.  Is always diagonalizable
    E.  Has $n$ distinct eigenvalues, where $n = \dim V$
    ans: B

21. A real $n \times n$ matrix $A$ is orthogonal if:
    A.  $A^T = A$
    B.  $A^T A = I$
    C.  $\det(A) = 1$
    D.  All its entries are 0 or 1
    E.  $A^2 = A$
    ans: B

22. The determinant of an orthogonal matrix is:
    A.  Always 1
    B.  Always -1
    C.  Always $\pm 1$
    D.  Always 0
    E.  Any real number
    ans: C

23. The special orthogonal group $SO(n)$ consists of $n \times n$ orthogonal matrices $A$ such that:
    A.  $\det(A) = -1$
    B.  $\det(A) = 1$
    C.  $\text{tr}(A) = 0$
    D.  $A$ is symmetric
    E.  $A$ is skew-symmetric
    ans: B

24. Rotations of $\mathbb{R}^3$ about the origin correspond to matrices in:
    A.  $O(3)$
    B.  $GL(3, \mathbb{R})$
    C.  $SO(3)$
    D.  The set of symmetric $3 \times 3$ matrices
    E.  The set of $3 \times 3$ matrices with determinant 0
    ans: C

25. Which of the following is NOT equivalent to matrix $A$ being orthogonal?
    A.  $A^T = A^{-1}$
    B.  Multiplication by $A$ preserves the dot product: $(AX) \cdot (AY) = X \cdot Y$
    C.  The columns of $A$ form an orthonormal basis
    D.  The rows of $A$ form an orthonormal basis
    E.  $A$ is symmetric and $\det(A)=\pm 1$
    ans: E

26. A rigid motion $m: \mathbb{R}^n \to \mathbb{R}^n$ which fixes the origin is:
    A.  Always a translation
    B.  Represented by multiplication by an orthogonal matrix
    C.  Always the identity map
    D.  A map that scales all distances by a fixed factor
    E.  Not necessarily linear
    ans: B

27. Every rigid motion $m: \mathbb{R}^n \to \mathbb{R}^n$ can be expressed in the form $m(X) = AX + b$, where $A$ is:
    A.  Any invertible matrix and $b$ is any vector
    B.  An orthogonal matrix and $b$ is any vector
    C.  A symmetric matrix and $b$ is any vector
    D.  A rotation matrix and $b=0$
    E.  The identity matrix and $b$ is any vector (i.e., a pure translation)
    ans: B

28. An important lemma for proving that any matrix $A \in SO(3)$ represents a rotation states that:
    A.  $A$ has 3 distinct real eigenvalues.
    B.  $A$ always has the eigenvalue 1.
    C.  $A$ always has the eigenvalue -1.
    D.  $A$ is symmetric.
    E.  $\text{tr}(A) = 0$.
    ans: B

29. Any linear operator on a finite-dimensional complex vector space can be represented by what type of matrix with respect to some basis?
    A.  Diagonal
    B.  Symmetric
    C.  Orthogonal
    D.  Upper triangular
    E.  Skew-symmetric
    ans: D

30. A linear operator $T$ on a finite-dimensional vector space $V$ over a field $F$ is diagonalizable if and only if:
    A.  Its characteristic polynomial has no repeated roots.
    B.  $V$ has a basis consisting of eigenvectors of $T$.
    C.  $T$ is invertible.
    D.  All eigenvalues of $T$ are in $F$.
    E.  The matrix of $T$ is symmetric.
    ans: B

31. Eigenvectors corresponding to distinct eigenvalues are:
    A.  Always orthogonal
    B.  Always linearly dependent
    C.  Always linearly independent
    D.  Always form a basis for the entire space
    E.  Always zero vectors
    ans: C

32. If an $n \times n$ matrix $A$ has $n$ distinct eigenvalues over a field $F$, then $A$ is:
    A.  Similar to a triangular matrix but not necessarily diagonal over $F$.
    B.  Similar to a diagonal matrix over $F$.
    C.  Not invertible.
    D.  An orthogonal matrix.
    E.  A zero matrix.
    ans: B

33. If $A = PDP^{-1}$ where $D$ is a diagonal matrix, then $A^k$ is:
    A.  $P D P^{-k}$
    B.  $P^k D^k (P^{-1})^k$
    C.  $P D^k P^{-1}$
    D.  $D^k$
    E.  $(PDP^{-1})^k$ which cannot be simplified further in general.
    ans: C

34. For the system of differential equations $\frac{dX}{dt} = AX$, if $v$ is an eigenvector of $A$ with eigenvalue $\lambda$, then a solution is:
    A.  $X(t) = e^{\lambda t} v$
    B.  $X(t) = e^{At} v$
    C.  $X(t) = \lambda t v$
    D.  $X(t) = e^{\lambda v} t$
    E.  $X(t) = t^\lambda v$
    ans: A

35. If $A$ is a real $n \times n$ matrix and $X(t)$ is a complex-valued solution to $\frac{dX}{dt} = AX$, then:
    A.  Only $\text{Re}(X(t))$ is a real solution.
    B.  Only $\text{Im}(X(t))$ is a real solution.
    C.  Both $\text{Re}(X(t))$ and $\text{Im}(X(t))$ are real solutions.
    D.  Neither $\text{Re}(X(t))$ nor $\text{Im}(X(t))$ are generally solutions.
    E.  $|X(t)|$ is a real solution.
    ans: C

36. The matrix exponential $e^A$ is defined by the series:
    A.  $I - A + A^2/2! - A^3/3! + \dots$
    B.  $A + A^2/2! + A^3/3! + \dots$
    C.  $I + A + A^2/2! + A^3/3! + \dots$
    D.  $I + A + A^2 + A^3 + \dots$
    E.  $\sum_{k=0}^\infty (A-I)^k/k!$
    ans: C

37. If $A$ is a diagonal matrix with diagonal entries $\lambda_1, \dots, \lambda_n$, then $e^A$ is a diagonal matrix with diagonal entries:
    A.  $\lambda_1, \dots, \lambda_n$
    B.  $e^{\lambda_1}, \dots, e^{\lambda_n}$
    C.  $1+\lambda_1, \dots, 1+\lambda_n$
    D.  $e\lambda_1, \dots, e\lambda_n$
    E.  $\ln(\lambda_1), \dots, \ln(\lambda_n)$
    ans: B

38. The property $e^{A+B} = e^A e^B$ holds for square matrices $A$ and $B$ if:
    A.  Always
    B.  $A$ and $B$ are invertible
    C.  $A$ and $B$ are diagonalizable
    D.  $AB = BA$ (A and B commute)
    E.  $A$ or $B$ is the zero matrix
    ans: D

39. The derivative of the matrix-valued function $e^{tA}$ with respect to $t$ is:
    A.  $e^{tA}$
    B.  $t A e^{tA}$
    C.  $A e^{tA}$
    D.  $e^{tA} A^{-1}$
    E.  $I + tA + t^2A^2/2! + \dots$
    ans: C

40. The general solution to the system of differential equations $\frac{dX}{dt} = AX$ can be written as (where $C$ is a constant vector):
    A.  $X(t) = e^{At} C$
    B.  $X(t) = e^{Ct} A$
    C.  $X(t) = (At+I)C$
    D.  $X(t) = \sin(At)C + \cos(At)C$
    E.  $X(t) = A^{-1} e^{At} C$
    ans: A

41. The trace of a square matrix $A$, denoted $\text{tr}(A)$, is:
    A.  The product of its diagonal entries.
    B.  The sum of its diagonal entries.
    C.  Its determinant.
    D.  The sum of its eigenvalues, each counted with algebraic multiplicity.
    E.  Both B and D are correct.
    ans: E

42. The Cayley-Hamilton Theorem states that if $p(t)$ is the characteristic polynomial of a square matrix $A$, then:
    A.  $p(A) = I$ (identity matrix)
    B.  $p(A) = A$
    C.  $p(A) = 0$ (zero matrix)
    D.  $p(0) = \det(A)$
    E.  The roots of $p(A)$ are the eigenvalues of $A$.
    ans: C

43. A linear operator $T$ is called nilpotent if:
    A.  $T^k = 0$ for some positive integer $k$.
    B.  $T^2 = T$.
    C.  $T$ has no eigenvectors.
    D.  All eigenvalues of $T$ are 1.
    E.  $T$ is not invertible.
    ans: A

44. If $T: V \to V$ is a linear operator and $V = W_1 \oplus W_2$ where $W_1, W_2$ are $T$-invariant subspaces, then the matrix of $T$ with respect to a basis formed by concatenating bases of $W_1$ and $W_2$ is:
    A.  Upper triangular
    B.  Lower triangular
    C.  Block diagonal: $\begin{pmatrix} A_1 & 0 \\ 0 & A_2 \end{pmatrix}$
    D.  A Jordan block
    E.  The identity matrix
    ans: C

45. The dimension of the space of solutions to the homogeneous linear equation $AX=0$, where $A$ is an $m \times n$ matrix of rank $r$, is:
    A.  $n-r$
    B.  $m-r$
    C.  $n$
    D.  $r$
    E.  $m+n-r$
    ans: A

46. If a real matrix $A$ has a complex eigenvalue $\lambda = a+bi$ ($b \neq 0$) with eigenvector $v = x+iy$, then a pair of linearly independent real solutions to $\frac{dX}{dt}=AX$ can be derived from:
    A. $e^{at}\cos(bt)x$ and $e^{at}\sin(bt)y$
    B. $e^{at}(\cos(bt)x - \sin(bt)y)$ and $e^{at}(\sin(bt)x + \cos(bt)y)$
    C. $e^{\lambda t}x$ and $e^{\bar{\lambda} t}y$
    D. $\text{Re}(e^{\lambda t}x)$ and $\text{Im}(e^{\lambda t}y)$
    E. $e^{at}x$ and $e^{bt}y$
    ans: B

### Chapter 5: SYMMETRY

1.  The symmetry exemplified by a typical human body or the stick figure in Figure (1.1) is best described as:
    ![](./images/ch5_fig1-1_stickfigure.png)
    A.  Rotational symmetry
    B.  Bilateral symmetry
    C.  Translational symmetry
    D.  Glide symmetry
    E.  No symmetry
    ans: B

2.  A starfish, as shown in Figure (1.2), primarily exhibits which type of symmetry?
    ![](./images/ch5_fig1-2_starfish.png)
    A.  Bilateral symmetry
    B.  Translational symmetry
    C.  Rotational symmetry
    D.  Glide symmetry
    E.  Asymmetry
    ans: C

3.  A repeating pattern of footprints in the snow, as in Figure (1.4), demonstrates:
    ![](./images/ch5_fig1-4_footprints.png)
    A.  Pure rotational symmetry
    B.  Pure translational symmetry
    C.  Bilateral symmetry only
    D.  Glide symmetry
    E.  Pure reflectional symmetry
    ans: D

4.  A rigid motion, also known as an isometry, is a map $m: P \rightarrow P$ from the plane to itself that:
    A.  Preserves angles but not distances
    B.  Preserves distances
    C.  Scales all distances by a constant factor
    D.  Is always a rotation
    E.  Flips the plane over
    ans: B

5.  The set of all symmetries of a figure F in the plane forms:
    A.  An arbitrary set of motions
    B.  A field of motions
    C.  A subgroup of M (the group of all rigid motions)
    D.  Only the identity motion
    E.  A group only if F is a regular polygon
    ans: C

6.  Which of the following is an orientation-preserving motion?
    A.  Reflection
    B.  Glide reflection
    C.  Rotation
    D.  Inversion through a point (in 3D)
    E.  The map $m(x) = -x$ (reflection about origin in 1D)
    ans: C

7.  Which of the following is an orientation-reversing motion?
    A.  Translation
    B.  Rotation by $\pi$
    C.  Glide Reflection
    D.  Identity
    E.  Composition of two rotations
    ans: C

8.  According to Theorem 2.2, every rigid motion in the plane is a translation, a rotation, a reflection, a glide reflection, or:
    A.  A dilation
    B.  The identity
    C.  A shear
    D.  An inversion
    E.  A projection
    ans: B

9.  The composition of two reflections about nonparallel lines $l_1, l_2$ is:
    A.  A translation
    B.  A reflection about a third line
    C.  A rotation about the intersection point $p = l_1 \cap l_2$
    D.  A glide reflection
    E.  The identity
    ans: C

10. A non-identity rotation in the plane fixes:
    A.  No points
    B.  Exactly one point
    C.  A line of points
    D.  Exactly two points
    E.  The entire plane
    ans: B

11. In the standard form $m = t_a \rho_\theta$ or $m = t_a \rho_\theta r$ for a rigid motion, $r$ represents:
    A.  Rotation by angle $r$
    B.  Reflection about the x-axis
    C.  Radius of a rotation
    D.  A random vector
    E.  A rational scaling factor
    ans: B

12. The composition rule $\rho_\theta t_a$ is equivalent to $t_{a'} \rho_\theta$ where $a'$ is:
    A.  $a$
    B.  $-a$
    C.  $\rho_\theta(a)$
    D.  $r(a)$
    E.  $a + \theta$
    ans: C

13. The group O, a subgroup of M, consists of orthogonal operators. These are:
    A.  All translations and rotations
    B.  Rotations about the origin and reflections about lines through the origin
    C.  Only rotations about the origin
    D.  Only translations
    E.  All glide reflections
    ans: B

14. The kernel of the homomorphism $\varphi: M \rightarrow O$ (where $\varphi(t_a \rho_\theta) = \rho_\theta$) is:
    A.  The group of rotations O
    B.  The trivial group {1}
    C.  The group of translations T
    D.  The entire group M
    E.  The group of reflections
    ans: C

15. The Fixed Point Theorem for finite groups of motions states that:
    A.  Every motion in a finite group G has a fixed point.
    B.  There is at least one point in the plane left fixed by every element of a finite group G.
    C.  Only the identity element in a finite group G has fixed points.
    D.  Finite groups cannot have fixed points.
    E.  Every point is a fixed point for some motion in a finite group G.
    ans: B

16. Finite subgroups of O (motions fixing the origin) are classified as:
    A.  Only cyclic groups $C_n$
    B.  Only dihedral groups $D_n$
    C.  Cyclic groups $C_n$ or dihedral groups $D_n$
    D.  Translation groups
    E.  Groups of glide reflections
    ans: C

17. The dihedral group $D_n$ (for $n \ge 3$) is the group of symmetries of:
    A.  A circle
    B.  A regular n-sided polygon
    C.  A line segment
    D.  An ellipse
    E.  A set of n distinct points on a line
    ans: B

18. The defining relations for the dihedral group $D_n$ with generator $x$ (rotation) and $y$ (reflection) include $x^n=1$, $y^2=1$, and:
    A.  $xy = yx$
    B.  $yx = x^{-1}y$
    C.  $yx = xy^{-1}$
    D.  $yx = x^2y$
    E.  $yxy = x$
    ans: B

19. The dihedral group $D_3$ is isomorphic to:
    A.  $C_3$
    B.  $C_6$
    C.  $S_3$ (symmetric group on 3 elements)
    D.  $Z_6$ (integers modulo 6)
    E.  The Klein four-group
    ans: C

20. A discrete group of motions is one that:
    A.  Is finite
    B.  Contains only translations
    C.  Does not contain arbitrarily small translations or rotations
    D.  Contains only rotations
    E.  Has a fixed point for every element
    ans: C

21. Which of the following is NOT a possible structure for a discrete subgroup $L_G$ (translation group) of $\mathbb{R}^2$?
    A.  The trivial group $\{0\}$
    B.  A group generated by one non-zero vector $\{ma \mid m \in \mathbb{Z}\}$
    C.  A group generated by two linearly independent vectors $\{ma + nb \mid m, n \in \mathbb{Z}\}$ (a lattice)
    D.  A dense set of points in $\mathbb{R}^2$
    E.  All of the above are possible
    ans: D

22. The point group $\bar{G}$ of a discrete group of motions $G$ is always:
    A.  Infinite
    B.  A translation group
    C.  Cyclic ($C_n$) or Dihedral ($D_n$)
    D.  The trivial group
    E.  A group of glide reflections
    ans: C

23. The Crystallographic Restriction states that any rotation in the point group of a symmetry group of a 2D lattice can only have orders:
    A.  1, 2, 3, 4, 5, 6
    B.  Any integer order
    C.  1, 2, 3, 4, 6
    D.  Only 2, 4, 6
    E.  Only prime orders
    ans: C

24. A two-dimensional crystallographic group (or wallpaper group) is a discrete group G whose translation group $L_G$:
    A.  Is trivial
    B.  Is generated by a single vector
    C.  Forms a plane lattice
    D.  Consists only of rotations
    E.  Is finite
    ans: C

25. There are exactly how many distinct types of two-dimensional crystallographic groups (wallpaper patterns)?
    A.  5
    B.  12
    C.  17
    D.  23
    E.  Infinitely many
    ans: C

26. An operation of a group G on a set S is a rule assigning an element $gs \in S$ to each $g \in G$ and $s \in S$, satisfying $1s=s$ and:
    A.  $g(s_1 s_2) = (gs_1)(gs_2)$
    B.  $(g_1 g_2)s = g_1(g_2 s)$
    C.  $g s = s g$
    D.  $g(g^{-1}s) = s$ for all $s$
    E.  $g_1 s = g_2 s \implies g_1 = g_2$
    ans: B

27. The orbit $O_s$ of an element $s \in S$ under the action of a group G is:
    A.  The set of all $g \in G$ such that $gs=s$
    B.  The set of all $s' \in S$ such that $s' = gs$ for some $g \in G$
    C.  The set S itself
    D.  The element s alone
    E.  A subgroup of G
    ans: B

28. A group G acts transitively on a set S if:
    A.  Every element of G fixes every element of S
    B.  S has only one element
    C.  For any $s_1, s_2 \in S$, there exists $g \in G$ such that $gs_1 = s_2$
    D.  G is an abelian group
    E.  Every element of S is fixed by some non-identity element of G
    ans: C

29. The stabilizer $G_s$ of an element $s \in S$ is defined as:
    A.  $\{s' \in S \mid gs = s' \text{ for some } g \in G\}$
    B.  $\{g \in G \mid gs = s\}$
    C.  $\{g \in G \mid gs \neq s\}$
    D.  $\{g \in G \mid g s' = s \text{ for some } s' \in S\}$
    E.  The set of all orbits
    ans: B

30. If G acts on the coset space G/H, the action is $g(aH) = (ga)H$. The stabilizer of the coset H (i.e., $1H$) is:
    A.  The trivial subgroup {1}
    B.  G itself
    C.  H
    D.  The normalizer of H in G
    E.  The center of G
    ans: C

31. Proposition 6.4 states there's a natural bijective map $\varphi: G/G_s \rightarrow O_s$. This map is defined by:
    A.  $\varphi(aG_s) = a^{-1}s$
    B.  $\varphi(aG_s) = s a$
    C.  $\varphi(aG_s) = as$
    D.  $\varphi(aG_s) = G_s a$
    E.  $\varphi(aG_s) = s$
    ans: C

32. If $s' = as$, then the stabilizer $G_{s'}$ is related to $G_s$ by:
    A.  $G_{s'} = G_s$
    B.  $G_{s'} = a G_s a^{-1}$
    C.  $G_{s'} = a^{-1} G_s a$
    D.  $G_{s'} = G_s a$
    E.  $G_{s'} = a G_s$
    ans: B

33. The Counting Formula states that for a finite group G acting on a set S, $|G| = $:
    A.  $|G_s| / |O_s|$
    B.  $|O_s| / |G_s|$
    C.  $|G_s| \cdot |O_s|$
    D.  $|G_s| + |O_s|$
    E.  $[G:O_s] \cdot |G_s|$
    ans: C

34. The group of orientation-preserving symmetries of a regular dodecahedron is the icosahedral group I. Its order is:
    A.  12
    B.  20
    C.  24
    D.  30
    E.  60
    ans: E

35. A permutation representation of a group G is a homomorphism $\varphi: G \rightarrow S_n$ (or more generally, $\varphi: G \rightarrow \text{Perm}(S)$). The operation is faithful if:
    A.  $\varphi$ is surjective
    B.  The kernel of $\varphi$ is trivial (only the identity element of G maps to the identity permutation)
    C.  S has n elements
    D.  G is isomorphic to $S_n$
    E.  Every element of S is fixed by some element of G
    ans: B

36. The group $GL_2(\mathbb{F}_2)$ of invertible 2x2 matrices with entries in the field of 2 elements is isomorphic to:
    A.  $C_6$
    B.  $D_3$ (which is $S_3$)
    C.  $C_2 \times C_2$ (Klein four-group)
    D.  $C_4$
    E.  $D_4$
    ans: B

37. The group of automorphisms of $S_3$, denoted $\text{Aut}(S_3)$, is isomorphic to:
    A.  $C_2$
    B.  $C_3$
    C.  $S_3$
    D.  $C_6$
    E.  The trivial group
    ans: C

38. The group of automorphisms of a cyclic group of prime order $p$, $\text{Aut}(C_p)$, is isomorphic to:
    A.  $C_{p-1}$
    B.  The multiplicative group $\mathbb{F}_p^\times$ (non-zero elements of $\mathbb{F}_p$ under multiplication)
    C.  $S_p$
    D.  $C_p$
    E.  The trivial group
    ans: B

39. Which of the following is NOT one of the types of finite subgroups of the 3D rotation group $SO(3)$?
    A.  Cyclic groups $C_k$
    B.  Dihedral groups $D_k$
    C.  The Tetrahedral group T (order 12)
    D.  The Heptahedral group H (order 14)
    E.  The Icosahedral group I (order 60)
    ans: D

40. The Octahedral group O, representing the rotational symmetries of a cube or octahedron, has order:
    A.  12
    B.  24
    C.  48
    D.  60
    E.  8
    ans: B

41. The formula $2 - \frac{2}{N} = \sum_{\text{orbits } i} (1 - \frac{1}{r_i})$, used in classifying finite subgroups of $SO(3)$, implies that there can be at most how many distinct orbits of poles?
    A.  1
    B.  2
    C.  3
    D.  4
    E.  N
    ans: C

42. In the classification of finite subgroups of $SO(3)$, if there is only one orbit of poles, the group must be:
    A.  Trivial (This case is impossible from the formula $2 - 2/N = 1 - 1/r_1$)
    B.  Cyclic $C_N$
    C.  Dihedral $D_{N/2}$
    D.  Icosahedral I
    E.  This case cannot happen. (The formula leads to $1+2/N = 1/r_1$, so $N(r_1-1) = -2r_1$, impossible for positive N, r1)
    ans: E

43. The symmetry group of Figure (1.3), showing pebbles repeating in one direction, is an example of a group generated by:
    ![](./images/ch5_fig1-3_pebbles.png)
    A.  A single reflection
    B.  A single rotation
    C.  A single translation
    D.  Two independent translations
    E.  A glide reflection
    ans: C

44. A wallpaper pattern, like in Figure (1.5), has a symmetry group that is a:
    ![](./images/ch5_fig1-5_wallpaper.png)
    A.  Finite group
    B.  One-dimensional crystallographic group
    C.  Two-dimensional crystallographic group (lattice group)
    D.  Cyclic group
    E.  Dihedral group
    ans: C

45. If a discrete group of motions G has a point group $\bar{G} = D_1 = \{1, r\}$, and its translation group $L_G$ is a lattice, then G could represent symmetries of a pattern with:
    A.  Only translations and rotations
    B.  Translations, rotations, and reflections across lines in multiple directions
    C.  Translations, and reflections/glides along a single family of parallel lines
    D.  Only 4-fold rotations
    E.  Only 6-fold rotations
    ans: C

### Chapter 6: MORE GROUP THEORY

1.  Cayley's Theorem states that every finite group G of order n is isomorphic to:
    A.  A cyclic group of order n
    B.  The symmetric group $S_n$
    C.  A subgroup of the symmetric group $S_n$
    D.  The alternating group $A_n$
    E.  A subgroup of $GL_n(\mathbb{R})$
    ans: C

2.  The centralizer of an element x in a group G, denoted $Z(x)$, is defined as:
    A.  $\{g \in G \mid gx = xg\}$
    B.  $\{g \in G \mid gxg^{-1} = x^{-1}\}$
    C.  $\{g \in G \mid g^x = x\}$
    D.  $\{x' \in G \mid x' = gxg^{-1} \text{ for some } g \in G\}$
    E.  The set of all elements that generate x.
    ans: A

3.  The conjugacy class of an element x in a group G, denoted $C_x$, is defined as:
    A.  $\{g \in G \mid gx = xg\}$
    B.  $\{gxg^{-1} \mid g \in G\}$
    C.  $\{g \in G \mid g^n = x \text{ for some integer } n\}$
    D.  The subgroup generated by x.
    E.  The set of elements y such that $xy=yx$.
    ans: B

4.  The Class Equation for a finite group G is given by:
    A.  $|G| = \sum_{x \in G} |Z(x)|$
    B.  $|G| = \sum_{i} |C_i|$, where $C_i$ are the distinct conjugacy classes.
    C.  $|G| = |Z(G)| + \sum_{x \notin Z(G)} |C_x|$
    D.  $|G| = \prod_{i} |C_i|$
    E.  $|Z(G)| = \sum_{i} |C_i| / |G|$
    ans: B

5.  Which of the following is always true for the order of any conjugacy class $C_x$ in a finite group G?
    A.  $|C_x|$ divides $|Z(x)|$
    B.  $|C_x|$ divides $|G|$
    C.  $|C_x|$ is a prime number
    D.  $|C_x| = |G| / |Z(G)|$
    E.  $|C_x|$ is always 1
    ans: B

6.  An element x is in the center $Z(G)$ of a group G if and only if:
    A.  Its conjugacy class $C_x$ is G itself.
    B.  Its conjugacy class $C_x = \{x\}$.
    C.  Its centralizer $Z(x) = \{e\}$.
    D.  Its centralizer $Z(x)$ is a proper subgroup of G.
    E.  x generates G.
    ans: B

7.  If G is a p-group (a group whose order is a power of a prime p), then its center $Z(G)$:
    A.  Is always trivial (only the identity element).
    B.  Has order p.
    C.  Has order greater than 1 (i.e., is non-trivial).
    D.  Is equal to G.
    E.  Has order dividing p-1.
    ans: C

8.  Every group of order $p^2$, where p is a prime number, is:
    A.  Always cyclic
    B.  Always non-abelian
    C.  Abelian
    D.  Simple
    E.  Isomorphic to $S_p$
    ans: C

9.  The operation of left multiplication of a group G on itself, $g \cdot x = gx$, is:
    A.  Always trivial
    B.  Never transitive
    C.  Always transitive and faithful
    D.  Faithful but not necessarily transitive
    E.  Transitive but not necessarily faithful
    ans: C

10. The operation of conjugation of a group G on itself, $g \cdot x = gxg^{-1}$:
    A.  Is always transitive
    B.  Has orbits which are the centralizers $Z(x)$
    C.  Has orbits which are the conjugacy classes $C_x$
    D.  Is always faithful
    E.  Makes G into an abelian group
    ans: C

11. The order of the icosahedral group I is:
    A.  12
    B.  20
    C.  24
    D.  60
    E.  120
    ans: D

12. The Class Equation for the icosahedral group I is:
    A.  $60 = 1 + 20 + 20 + 19$
    B.  $60 = 1 + 15 + 20 + 12 + 12$
    C.  $60 = 1 + 10 + 15 + 20 + 14$
    D.  $60 = 1 + 12 + 12 + 12 + 12 + 11$
    E.  $60 = 1 + 24 + 15 + 20$
    ans: B

13. A group G is called simple if:
    A.  It is abelian.
    B.  It has prime order.
    C.  It has no proper normal subgroups other than the trivial subgroup $\{e\}$ and G itself (and $G \ne \{e\}$).
    D.  All its elements have order 2.
    E.  It is generated by a single element.
    ans: C

14. The icosahedral group I is:
    A.  Abelian
    B.  Cyclic
    C.  Simple
    D.  A p-group
    E.  Has a normal subgroup of order 30
    ans: C

15. The icosahedral group I is isomorphic to which of the following groups?
    A.  $S_5$
    B.  $A_4$
    C.  $S_4$
    D.  $A_5$
    E.  $D_{30}$ (Dihedral group of order 60)
    ans: D

16. A normal subgroup N of a group G is always:
    A.  A single conjugacy class.
    B.  The union of some conjugacy classes of G.
    C.  The center of G.
    D.  A Sylow p-subgroup.
    E.  Generated by elements of order 2.
    ans: B

17. The normalizer of a subgroup H in G, denoted $N(H)$, is defined as:
    A.  $\{g \in G \mid gh = hg \text{ for all } h \in H\}$
    B.  $\{g \in G \mid gHg^{-1} = H\}$
    C.  $\{h \in H \mid gh = hg \text{ for all } g \in G\}$
    D.  The smallest subgroup containing H.
    E.  The set of all conjugates of H.
    ans: B

18. A subgroup H is normal in G if and only if its normalizer $N(H)$ is:
    A.  H itself
    B.  The trivial subgroup $\{e\}$
    C.  G itself
    D.  The center $Z(G)$
    E.  A simple group
    ans: C

19. The number of distinct subgroups conjugate to a subgroup H in G is equal to:
    A.  $|G| / |H|$
    B.  $|N(H)| / |H|$
    C.  $|G| / |N(H)|$
    D.  $|G| - |N(H)|$
    E.  $|C_x|$ for some $x \in H$
    ans: C

20. A Sylow p-subgroup of a finite group G (where $|G|=p^e m$ and p does not divide m) is a subgroup of order:
    A.  p
    B.  $p^k$ for any $k \le e$
    C.  $p^e$
    D.  m
    E.  $p^e m / p$
    ans: C

21. The First Sylow Theorem states that:
    A.  All Sylow p-subgroups are conjugate.
    B.  The number of Sylow p-subgroups $s \equiv 1 \pmod p$.
    C.  A Sylow p-subgroup always exists if p divides $|G|$.
    D.  Every p-subgroup is contained in a Sylow p-subgroup.
    E.  Sylow p-subgroups are always normal.
    ans: C

22. A direct consequence of the First Sylow Theorem is that if a prime p divides the order of a finite group G, then:
    A.  G is a p-group.
    B.  G has a normal subgroup of order p.
    C.  G contains an element of order p.
    D.  The center of G has order p.
    E.  All elements of G have order p.
    ans: C

23. The Second Sylow Theorem states (among other things) that:
    A.  All Sylow p-subgroups are normal.
    B.  All Sylow p-subgroups are conjugate to each other.
    C.  The number of Sylow p-subgroups divides the order of G.
    D.  Every p-group is a Sylow p-subgroup of some larger group.
    E.  A Sylow p-subgroup is unique.
    ans: B

24. According to the Third Sylow Theorem, if $s$ is the number of Sylow p-subgroups of G and $|G|=p^e m$ (p does not divide m), then:
    A.  $s$ divides $p^e$ and $s \equiv 1 \pmod m$
    B.  $s$ divides $m$ and $s \equiv 1 \pmod p$
    C.  $s$ divides $p$ and $s \equiv 1 \pmod m$
    D.  $s$ divides $m$ and $s = p k$ for some integer k
    E.  $s = 1$ always.
    ans: B

25. Any group of order 15 is:
    A.  Simple
    B.  Non-abelian
    C.  Isomorphic to $S_3 \times C_5$
    D.  Cyclic
    E.  Has 5 Sylow 3-subgroups
    ans: D

26. For a group G of order 21, the number of Sylow 7-subgroups ($s_7$) must be:
    A.  1 or 7
    B.  1 or 3
    C.  Exactly 1
    D.  Exactly 7
    E.  3 or 7
    ans: C

27. In a group of order 12, a Sylow 2-subgroup has order ___, and a Sylow 3-subgroup has order ___.
    A.  2, 3
    B.  4, 3
    C.  6, 2
    D.  4, 6
    E.  2, 6
    ans: B

28. For a group G of order 12, which statement is true regarding its Sylow subgroups?
    A.  Both Sylow 2-subgroup and Sylow 3-subgroup must be normal.
    B.  Neither Sylow 2-subgroup nor Sylow 3-subgroup can be normal.
    C.  At least one of its Sylow subgroups (either Sylow 2 or Sylow 3) must be normal.
    D.  It must have 4 Sylow 3-subgroups and 3 Sylow 2-subgroups.
    E.  It must be simple.
    ans: C

29. If a group G of order 12 has both its Sylow 2-subgroup H and Sylow 3-subgroup K as normal subgroups, then G is isomorphic to:
    A.  $A_4$
    B.  $D_6$
    C.  $H \times K$
    D.  A simple group
    E.  $S_4$
    ans: C

30. The alternating group $A_4$ (order 12) has:
    A.  A normal Sylow 3-subgroup.
    B.  4 Sylow 3-subgroups and its Sylow 2-subgroup (Klein-4 group V) is normal.
    C.  A normal Sylow 2-subgroup ($C_4$).
    D.  Is simple.
    E.  3 Sylow 2-subgroups ($C_4$) and a normal Sylow 3-subgroup.
    ans: B

31. How many non-isomorphic groups of order 12 are there?
    A.  1
    B.  2
    C.  3
    D.  4
    E.  5
    ans: E

32. If $\sigma = (i_1 i_2 \dots i_k)$ is a cycle and $q$ is a permutation, then $q \sigma q^{-1}$ (using function composition order $q^{-1}$ then $\sigma$ then $q$) is:
    A.  $(i_1 i_2 \dots i_k)$
    B.  $(i_k \dots i_2 i_1)$
    C.  $(q(i_1) q(i_2) \dots q(i_k))$
    D.  A product of k transpositions
    E.  The identity permutation
    ans: C
    *(Note: The text uses $q^{-1}\sigma q$ for $x \mapsto q(\sigma(q^{-1}(x)))$, which is standard for $x \mapsto gxg^{-1}$. If the question implies $ip$ notation (as in text sec 6, $q\sigma q^{-1}$ means permute by $q$, then by $\sigma$, then by $q^{-1}$), the effect on indices is $j \mapsto j q \sigma q^{-1}$. The conjugate $q^{-1}\sigma q$ maps $iq \to i\sigma q$. So the cycle $(i_1...i_k)$ becomes $(i_1q...i_kq)$. The question formulation is slightly ambiguous if one strictly follows the text's switch in sec 6 from $p(x)$ to $ip$. Assuming the standard group theory conjugation $gxg^{-1}$ acting on elements, or the equivalent effect on cycle structure representation).*

33. Two permutations in $S_n$ are conjugate if and only if:
    A.  They have the same order.
    B.  They are both even or both odd.
    C.  They operate on the same set of indices.
    D.  They have the same cycle structure (same number of cycles of each length).
    E.  Their product is the identity.
    ans: D

34. In the symmetric group $S_4$, the number of 3-cycles is:
    A.  3
    B.  4
    C.  6
    D.  8
    E.  12
    ans: D

35. The set of operators on $F_p$ of the form $x \leadsto cx + a$ (where $c \neq 0$) forms a group of order:
    A.  $p$
    B.  $p-1$
    C.  $p(p-1)$
    D.  $p^2$
    E.  $p!$
    ans: C

36. A "reduced word" in the context of a free group is a word that:
    A.  Contains only one distinct symbol.
    B.  Has length 1.
    C.  Cannot be shortened by cancelling adjacent $xx^{-1}$ or $x^{-1}x$ pairs.
    D.  Is the identity element.
    E.  Is a generator.
    ans: C

37. The free group F on a single generator $S=\{a\}$ is isomorphic to:
    A.  The trivial group $\{e\}$
    B.  The cyclic group of order 2, $C_2$
    C.  The integers under addition, $\mathbb{Z}$
    D.  The symmetric group $S_3$
    E.  The rational numbers under addition, $\mathbb{Q}$
    ans: C

38. The mapping property of a free group F on a set S states that for any group G and any map of sets $f: S \to G$:
    A.  There is no homomorphism from F to G unless G is also free.
    B.  There is a unique homomorphism $\phi: F \to G$ that extends $f$.
    C.  There are infinitely many homomorphisms from F to G extending $f$.
    D.  $f$ itself must be a homomorphism.
    E.  F must be a subgroup of G.
    ans: B

39. A group G is defined by generators S and relations R, denoted $\langle S \mid R \rangle$. This means G is isomorphic to:
    A.  The free group F on S.
    B.  The smallest normal subgroup N of F containing R.
    C.  $F/N$, where F is the free group on S and N is the smallest normal subgroup of F containing R.
    D.  The direct product of groups generated by each $s \in S$.
    E.  The set R itself.
    ans: C

40. The commutator of two elements x and y in a group is $xyx^{-1}y^{-1}$. It is equal to the identity element if and only if:
    A.  x is the inverse of y.
    B.  x and y both have order 2.
    C.  x and y commute.
    D.  The group is cyclic.
    E.  x or y is the identity.
    ans: C

41. The group presented as $\langle x,y \mid xyx^{-1}y^{-1}=1 \rangle$ is known as the:
    A.  Free group on {x, y}
    B.  Free abelian group on {x, y}
    C.  Dihedral group $D_2$
    D.  Symmetric group $S_2$
    E.  Quaternion group
    ans: B

42. The mapping property of quotient groups states that if $N \triangleleft G$, $\pi: G \to G/N$ is the canonical map, and $\phi: G \to G'$ is a homomorphism whose kernel contains N, then:
    A.  $G'$ must be isomorphic to $G/N$.
    B.  There is a unique homomorphism $\bar{\phi}: G/N \to G'$ such that $\bar{\phi}\pi = \phi$.
    C.  $\ker \phi = N$.
    D.  $\phi$ must be surjective.
    E.  $G/N$ is a subgroup of $G'$.
    ans: B

43. The Todd-Coxeter algorithm is primarily used to:
    A.  Find the center of a group.
    B.  Determine if a group is simple.
    C.  List all elements of a free group.
    D.  Enumerate the cosets of a subgroup H in a finitely presented group G.
    E.  Calculate the order of elements in a group.
    ans: D

44. In the Todd-Coxeter algorithm, Rule 3 states that:
    A.  All relations must operate trivially on all cosets.
    B.  The operation of each group generator must be a permutation of cosets.
    C.  The generators of the subgroup H (for which cosets are being found) fix the coset $H1$.
    D.  New coset indices are introduced whenever an operation is undefined.
    E.  The operation on cosets must be transitive.
    ans: C

45. If the Todd-Coxeter algorithm terminates successfully for a finite group G and subgroup H, the resulting table describes:
    A.  The multiplication table of G.
    B.  The character table of G.
    C.  A permutation representation of G acting on the (right) cosets of H.
    D.  The structure of the free group from which G is derived.
    E.  The list of all normal subgroups of G.
    ans: C

46. The Fixed Point Theorem for p-groups states that if a p-group G acts on a finite set S and the order of S is not divisible by p, then:
    A.  Every element of S is a fixed point.
    B.  There are exactly p fixed points.
    C.  There are no fixed points.
    D.  There is at least one fixed point for the action of G on S.
    E.  The action must be trivial.
    ans: D

47. If a group G has order $p^2$ (p prime), it is isomorphic to $C_{p^2}$ or:
    A.  $D_p$ (Dihedral group of order 2p)
    B.  $S_p$
    C.  $C_p \times C_p$
    D.  $A_p$
    E.  A non-abelian simple group
    ans: C

### Chapter 7: Bilinear Forms

1.  A function $f: V \times V \to F$ is a bilinear form. Which of the following defines bilinearity if $X_1, X_2, Y, Y_1, Y_2$ are vectors in $V$ and $c \in F$?
    A.  $f(X_1+X_2, Y) = f(X_1,Y) + f(X_2,Y)$ and $f(X, cY) = c f(X,Y)$
    B.  $f(cX_1, Y_1+Y_2) = c f(X_1,Y_1) + c f(X_1,Y_2)$
    C.  $f(X_1+X_2, Y) = f(X_1,Y) + f(X_2,Y)$, $f(X, Y_1+Y_2) = f(X,Y_1) + f(X,Y_2)$, and $f(cX,Y) = f(X,cY) = c f(X,Y)$
    D.  $f(X,Y) = f(Y,X)$ and $f(X+Y, Z) = f(X,Z) + f(Y,Z)$
    E.  $f(X,X) > 0$ for $X \neq 0$ and $f(cX,Y) = c f(X,Y)$
    ans: C

2.  A bilinear form $\langle \cdot, \cdot \rangle$ on $V$ is symmetric if:
    A.  $\langle X, X \rangle = 0$ for all $X \in V$
    B.  $\langle X, Y \rangle = -\langle Y, X \rangle$ for all $X, Y \in V$
    C.  $\langle X, Y \rangle = \langle Y, X \rangle$ for all $X, Y \in V$
    D.  $\langle cX, Y \rangle = c \langle X, Y \rangle$ for all $X, Y \in V, c \in F$
    E.  If $\langle X, Y \rangle = 0$, then $X=0$ or $Y=0$
    ans: C

3.  If a bilinear form is represented by $\langle X, Y \rangle = X^t A Y$, the form is symmetric if and only if:
    A.  $A$ is invertible
    B.  $A = -A^t$
    C.  $A = A^t$
    D.  $A$ is a diagonal matrix
    E.  $\det(A) \neq 0$
    ans: C

4.  Let $A$ be the matrix of a bilinear form with respect to a basis $B$. If the basis is changed to $B'$ by a change-of-basis matrix $P$ such that $X = PX'$ (coordinates $X$ in $B$, $X'$ in $B'$), how does the matrix of the form $A'$ in basis $B'$ relate to $A$? (Using $X^tAY$ convention)
    A.  $A' = P^t A P$
    B.  $A' = P^{-1} A P$
    C.  $A' = (P^t)^{-1} A P^{-1}$
    D.  $A' = P A P^t$
    E.  $A = P^t A' P$
    ans: C

5.  A real symmetric matrix $A$ is positive definite if:
    A.  All its eigenvalues are positive.
    B.  $X^t A X > 0$ for all $X \neq 0$.
    C.  The determinants of all its leading principal minors are positive.
    D.  All of the above.
    E.  Only A and B.
    ans: D

6.  The Gram-Schmidt procedure applied to a basis $\{v_1, \dots, v_n\}$ with respect to a positive definite symmetric bilinear form $\langle \cdot, \cdot \rangle$ produces:
    A.  A basis where all vectors have length 1 with respect to the standard dot product.
    B.  An orthogonal basis with respect to $\langle \cdot, \cdot \rangle$.
    C.  An orthonormal basis with respect to $\langle \cdot, \cdot \rangle$.
    D.  A basis of eigenvectors for the matrix of the form.
    E.  A basis where $\langle v_i, v_j \rangle = \delta_{ij}$ or $0$.
    ans: C

7.  Consider a symmetric bilinear form on $\mathbb{R}^2$ given by $A = \begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix}$. This form is:
    A.  Positive definite
    B.  Positive semidefinite but not definite
    C.  Negative definite
    D.  Indefinite
    E.  The zero form
    ans: A

8.  For a symmetric bilinear form $\langle \cdot, \cdot \rangle$ on a real vector space $V$, a non-zero vector $v \in V$ is self-orthogonal if:
    A.  $\langle v, w \rangle = 0$ for all $w \in V$
    B.  $\langle v, v \rangle = 0$
    C.  $\langle v, v \rangle < 0$
    D.  $\langle v, v \rangle = 1$
    E.  $v$ is in the null space of the form.
    ans: B

9.  The null space $N$ of a symmetric bilinear form $\langle \cdot, \cdot \rangle$ on $V$ is defined as:
    A.  $\{v \in V \mid \langle v, v \rangle = 0 \}$
    B.  $\{v \in V \mid \langle v, w \rangle = 0 \text{ for some } w \neq 0 \}$
    C.  $\{v \in V \mid \langle v, w \rangle = 0 \text{ for all } w \in V \}$
    D.  The set of all self-orthogonal vectors.
    E.  The kernel of the associated linear map $V \to V^*$.
    ans: C

10. A symmetric bilinear form is nondegenerate if its null space is $\{0\}$. This is equivalent to its matrix $A$ (in any basis) being:
    A.  Symmetric
    B.  Diagonal
    C.  Nonsingular (invertible)
    D.  Positive definite
    E.  Orthogonal
    ans: C

11. Sylvester's Law of Inertia for a real symmetric bilinear form states that which of the following are invariants under change of basis for an orthogonal basis where $\langle v_i, v_i \rangle \in \{1, -1, 0\}$?
    A.  The specific basis vectors.
    B.  The number of $1$'s ($p$), $-1$'s ($m$), and $0$'s ($z$) among $\langle v_i, v_i \rangle$.
    C.  The determinant of the matrix of the form.
    D.  The trace of the matrix of the form.
    E.  Only the rank $p+m$.
    ans: B

12. The signature of a real symmetric bilinear form is the pair $(p,m)$. If the form on $\mathbb{R}^3$ has matrix $\begin{pmatrix} 1 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & 0 \end{pmatrix}$ in some basis, its signature is:
    A.  (3,0)
    B.  (2,1)
    C.  (1,1)
    D.  (1,2)
    E.  (1,0)
    ans: C

13. In a Euclidean space (a real vector space with a positive definite symmetric bilinear form $\langle \cdot, \cdot \rangle$), the length of a vector $v$ is defined as:
    A.  $\langle v, v \rangle$
    B.  $\sqrt{\langle v, v \rangle}$
    C.  $|\langle v, v \rangle|$
    D.  $\sum v_i^2$
    E.  The largest component of $v$.
    ans: B

14. The Schwarz inequality in a Euclidean space states:
    A.  $\langle v, w \rangle \le |v| |w|$
    B.  $|\langle v, w \rangle| \le |v| |w|$
    C.  $|\langle v, w \rangle|^2 \le \langle v,v \rangle + \langle w,w \rangle$
    D.  $|v+w| \le |v| + |w|$
    E.  $|v-w| \ge ||v| - |w||$
    ans: B

15. If $W$ is a subspace of a Euclidean space $V$, and $\pi: V \to W$ is the orthogonal projection onto $W$, then for any $v \in V$, $v - \pi(v)$ is:
    A.  In $W$
    B.  Orthogonal to $W$ (i.e., in $W^\perp$)
    C.  The zero vector
    D.  Equal to $v$
    E.  Longer than $v$
    ans: B

16. A Hermitian form $\langle \cdot, \cdot \rangle$ on a complex vector space $V$ satisfies $\langle X, Y \rangle = \overline{\langle Y, X \rangle}$. This property is called:
    A.  Symmetry
    B.  Skew-symmetry
    C.  Bilinearity
    D.  Sesquilinearity
    E.  Hermitian symmetry (or Conjugate symmetry)
    ans: E

17. If a Hermitian form is represented by $\langle X, Y \rangle = X^* A Y$ (where $X^*$ is conjugate transpose), the form is Hermitian if and only if:
    A.  $A = A^t$
    B.  $A = -A^*$
    C.  $A = A^*$
    D.  $A$ is a real diagonal matrix
    E.  $\det(A)$ is real
    ans: C

18. For a Hermitian form, how does the matrix $A'$ in a new basis $B'$ relate to the matrix $A$ in an old basis $B$, if $X = PX'$ (coordinates $X$ in $B$, $X'$ in $B'$)? (Using $X^*AY$ convention)
    A.  $A' = P^* A P$
    B.  $A' = (P^*)^{-1} A P^{-1}$
    C.  $A' = P^{-1} A (P^*)^{-1}$
    D.  $A = P^* A' P$
    E.  $A' = P A P^*$
    ans: B

19. A complex matrix $P$ is unitary if:
    A.  $P^t P = I$
    B.  $P^* P = I$
    C.  $P P = I$
    D.  $\det(P) = 1$
    E.  $P = P^*$
    ans: B

20. An orthonormal basis exists for a Hermitian form if and only if the form is:
    A.  Nondegenerate
    B.  Symmetric
    C.  Skew-Hermitian
    D.  Positive definite
    E.  Represented by a unitary matrix
    ans: D

21. A linear operator $T$ on a Hermitian space $V$ is called a Hermitian operator if its matrix $M$ with respect to any orthonormal basis is Hermitian ($M=M^*$). This is equivalent to:
    A.  $\langle v, Tw \rangle = \langle Tv, w \rangle$ for all $v,w \in V$
    B.  $\langle v, w \rangle = \langle Tv, Tw \rangle$ for all $v,w \in V$
    C.  $T^2 = T$
    D.  $T^*T = I$
    E.  All eigenvalues of $T$ are 1.
    ans: A

22. The Spectral Theorem for Hermitian operators states that for a Hermitian operator $T$ on a finite-dimensional Hermitian space $V$:
    A.  $T$ is diagonalizable with complex eigenvalues.
    B.  There exists an orthonormal basis of $V$ consisting of eigenvectors of $T$, and the eigenvalues are real.
    C.  $T$ is a unitary operator.
    D.  The matrix of $T$ in any basis is diagonal.
    E.  $T$ can be represented by a real symmetric matrix.
    ans: B

23. The eigenvalues of a real symmetric matrix are:
    A.  Always real
    B.  Always purely imaginary
    C.  Always complex conjugates in pairs
    D.  Can be any complex numbers
    E.  Always positive
    ans: A

24. The quadratic form $q(x_1, x_2) = x_1^2 + 4x_1x_2 + x_2^2$ is associated with the symmetric matrix $A$:
    A.  $\begin{pmatrix} 1 & 4 \\ 0 & 1 \end{pmatrix}$
    B.  $\begin{pmatrix} 1 & 2 \\ 2 & 1 \end{pmatrix}$
    C.  $\begin{pmatrix} 1 & 4 \\ 4 & 1 \end{pmatrix}$
    D.  $\begin{pmatrix} 1 & 0 \\ 4 & 1 \end{pmatrix}$
    E.  $\begin{pmatrix} 1 & 2 \\ 0 & 1 \end{pmatrix}$
    ans: B

25. To classify a conic section $X^t A X + BX + c = 0$, the first step often involves an orthogonal transformation $X = PY$ (P orthogonal) to:
    A.  Eliminate the constant term $c$.
    B.  Eliminate the linear term $BX$.
    C.  Diagonalize the matrix $A$.
    D.  Make the matrix $A$ the identity matrix.
    E.  Translate the origin.
    ans: C

26. A nondegenerate conic $a_{11}x_1^2 + a_{22}x_2^2 - 1 = 0$ with $a_{11} > 0$ and $a_{22} > 0$ represents:
    A.  An ellipse
    B.  A hyperbola
    C.  A parabola
    D.  Two lines
    E.  A single point
    ans: A

27. A complex matrix $M$ is called normal if:
    A.  $M = M^*$
    B.  $M M^* = I$
    C.  $M M^* = M^* M$
    D.  $M = M^t$
    E.  All its entries are real.
    ans: C

28. The Spectral Theorem for normal operators states that a complex matrix $M$ is normal if and only if there exists a unitary matrix $P$ such that $PMP^*$ is:
    A.  A real diagonal matrix
    B.  A diagonal matrix (possibly with complex entries)
    C.  The identity matrix
    D.  A Hermitian matrix
    E.  A skew-Hermitian matrix
    ans: B

29. Which of the following types of matrices are always normal?
    A.  Hermitian matrices
    B.  Unitary matrices
    C.  Skew-Hermitian matrices ($M^* = -M$)
    D.  All of the above
    E.  Only A and B
    ans: D

30. A bilinear form $\langle \cdot, \cdot \rangle$ on a vector space $V$ (over any field $F$) is defined to be skew-symmetric if:
    A.  $\langle v, w \rangle = -\langle w, v \rangle$ for all $v,w \in V$
    B.  $\langle v, v \rangle = 0$ for all $v \in V$
    C.  Its matrix $A$ satisfies $A^t = -A$
    D.  It is not symmetric.
    E.  Both A and B (A implies B if char(F) != 2, B implies A always)
    ans: B

31. If a bilinear form is skew-symmetric (meaning $\langle v,v \rangle = 0$ for all $v$), then it also satisfies:
    A.  $\langle v,w \rangle = \langle w,v \rangle$
    B.  $\langle v,w \rangle = -\langle w,v \rangle$
    C.  $\langle v,w \rangle = 0$ for all $v,w$
    D.  $\langle v,w \rangle = \langle v,v \rangle \langle w,w \rangle$
    E.  The form must be the zero form.
    ans: B

32. The matrix $A$ of a skew-symmetric form with respect to any basis satisfies (assuming definition is $a_{ii}=0, a_{ij}=-a_{ji}$):
    A.  $A^t = A$
    B.  $A^t = -A$ (if char $\neq 2$)
    C.  $a_{ii} = 0$ and $a_{ij} = -a_{ji}$ for $i \neq j$.
    D.  $A$ is diagonal with zeros on the diagonal.
    E.  $A$ is invertible.
    ans: C

33. If $V$ is a finite-dimensional vector space with a nondegenerate skew-symmetric bilinear form, then the dimension of $V$ must be:
    A.  Odd
    B.  Even
    C.  A prime number
    D.  A perfect square
    E.  Any natural number
    ans: B

34. For a real positive definite symmetric matrix $A$, which statement is FALSE?
    A.  $A = P^t P$ for some invertible $P$.
    B.  All eigenvalues of $A$ are positive.
    C.  $\det(A) > 0$.
    D.  $X^t A X \ge 0$ for all $X$.
    E.  The Gram-Schmidt process can be used to find an orthonormal basis for the form $X^tAY$.
    ans: D (It should be $X^t A X > 0$ for $X \neq 0$. $X^t A X \ge 0$ defines positive semidefinite)

35. If $A$ is the matrix of a symmetric bilinear form w.r.t basis $B$, and $A'$ is the matrix w.r.t basis $B'$, and $B=B'P$, then (using $X^tAY$):
    A. $A = P^t A' P$
    B. $A' = P^t A P$
    C. $A = (P^{-1})^t A' P^{-1}$
    D. $A' = P^{-1} A (P^{-1})^t$
    E. None of the above.
    ans: A

36. Which property is NOT necessarily true for a general bilinear form $\langle X, Y \rangle = X^tAY$?
    A. $\langle X_1+X_2, Y \rangle = \langle X_1,Y \rangle + \langle X_2,Y \rangle$
    B. $\langle X, Y_1+Y_2 \rangle = \langle X,Y_1 \rangle + \langle X,Y_2 \rangle$
    C. $\langle cX, Y \rangle = c \langle X,Y \rangle$
    D. $\langle X, Y \rangle = \langle Y, X \rangle$
    E. $\langle X, cY \rangle = c \langle X,Y \rangle$
    ans: D

37. The Lorentz form on $\mathbb{R}^4$, $x_1y_1 + x_2y_2 + x_3y_3 - c^2x_4y_4$, is:
    A.  Positive definite
    B.  Negative definite
    C.  Indefinite
    D.  Positive semidefinite
    E.  The zero form
    ans: C

38. If a real symmetric matrix $A$ represents a dot product with respect to some basis, then:
    A. $A$ must be the identity matrix.
    B. $A$ must be orthogonal.
    C. $A$ must be positive definite.
    D. $A$ must have determinant 1.
    E. $A$ must be diagonal.
    ans: C

39. For a Hermitian form $\langle \cdot, \cdot \rangle$, the value $\langle v,v \rangle$ is always:
    A.  Real
    B.  Purely imaginary
    C.  Zero
    D.  Positive
    E.  A complex number with non-zero imaginary part unless $v=0$.
    ans: A

40. If $T$ is a unitary operator on a Hermitian space, then:
    A. $T$ preserves the Hermitian form: $\langle Tv, Tw \rangle = \langle v, w \rangle$.
    B. All eigenvalues of $T$ are real.
    C. $T = T^*$.
    D. $T$ is always diagonalizable by a unitary matrix to a real diagonal matrix.
    E. $\det(T)=1$.
    ans: A

41. For a real $n \times n$ matrix $A$, $A$ is positive definite if and only if the determinants of all $k \times k$ upper-left submatrices $A_k$ (leading principal minors) are:
    A. Non-negative
    B. Positive
    C. Non-zero
    D. Equal to 1
    E. Alternating in sign
    ans: B

42. The equation $x^2 - y^2 = 1$ in $\mathbb{R}^2$ represents:
    A. An ellipse
    B. A hyperbola
    C. A parabola
    D. A circle
    E. Two intersecting lines
    ans: B

43. A complex matrix $M$ is skew-Hermitian if $M^* = -M$. The eigenvalues of a skew-Hermitian matrix are:
    A. Always real
    B. Always purely imaginary or zero
    C. Always have magnitude 1
    D. Always positive
    E. Unrestricted
    ans: B

44. Under a change of orthonormal basis $P$ (where $P$ is unitary), the matrix $M$ of a linear operator $T$ changes to $M'$ where:
    A. $M' = P^{-1}MP$
    B. $M' = PMP^{-1}$
    C. $M' = PMP^*$
    D. $M' = P^*MP$
    E. $M' = P^tMP$
    ans: C

45. The set of all vectors $v$ such that $\langle v,v \rangle = 0$ for a symmetric bilinear form on $\mathbb{R}^3$ defined by matrix $A = \text{diag}(1, -1, 0)$ forms:
    A. Only the zero vector
    B. A line through the origin
    C. A plane through the origin
    D. A cone and the z-axis
    E. The entire space $\mathbb{R}^3$
    ans: D (The form is $x^2-y^2=0$. So $x=y$ or $x=-y$ (two planes if z is free), AND vectors $(0,0,z)$ are self-orthogonal. The set is $(k,k,z) \cup (k,-k,z)$ where $k^2-k^2=0$, this is true. And $(0,0,z)$ gives $0$. So, the "cone" is $x^2-y^2=0$, which is two planes $x=y$ and $x=-y$. Vectors on the z-axis are also self-orthogonal. So it's the union of two planes and the z-axis. More precisely, any vector of the form $(x,y,z)$ with $x^2-y^2=0$ is self-orthogonal. This is the union of the planes $x=y$ and $x=-y$. Any vector in the null space is also self-orthogonal. The null space is spanned by $(0,0,1)$. So it's these two planes.)

46. If $A$ is a real symmetric $n \times n$ matrix, then there exists an orthogonal matrix $P$ such that $P^T A P$ is:
    A. The identity matrix
    B. A diagonal matrix
    C. A matrix with $1, -1, 0$ on the diagonal
    D. Zero matrix
    E. An upper triangular matrix
    ans: B

47. If a bilinear form $\langle \cdot, \cdot \rangle$ is both symmetric and skew-symmetric (i.e. $\langle v,v \rangle = 0$), then over a field $F$ with characteristic not equal to 2:
    A. It must be the zero form.
    B. It must be positive definite.
    C. It must be negative definite.
    D. It implies $2 \langle v,w \rangle = 0$ for all $v,w$.
    E. Such a form cannot exist.
    ans: A (Symmetric: $\langle v,w \rangle = \langle w,v \rangle$. Skew-symmetric (from $\langle v,v \rangle=0$) implies $\langle v,w \rangle = -\langle w,v \rangle$. So $\langle v,w \rangle = -\langle v,w \rangle$, thus $2\langle v,w \rangle = 0$. If char $\neq 2$, then $\langle v,w \rangle = 0$.)