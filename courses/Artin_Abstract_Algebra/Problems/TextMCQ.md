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

### Chapter 2: Groups

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

### Chapter 4: Linear Transformations

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

### Chapter 5: Symmetry

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

### Chapter 6: More Group Theory

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

### Chapter 8: Linear Groups

1.  The classical linear groups $O_n$, $U_n$, and $Sp_{2n}$ arise as stabilizers of certain matrices under operations related to change of basis in bilinear or Hermitian forms. The Orthogonal group $O_n(\mathbb{R}) = \{P \in GL_n(\mathbb{R}) \mid P^tP = I\}$ is the stabilizer of which matrix $A$ under the operation $P, A \mapsto (P^t)^{-1}AP^{-1}$?
    A.  The zero matrix
    B.  The identity matrix $I$
    C.  The standard skew-symmetric matrix $J$
    D.  Any diagonal matrix
    E.  Any symmetric matrix
    ans: B

2.  Two $n \times n$ matrices $A$ and $A'$ are called congruent if $A' = QAQ^t$ for some $Q \in GL_n(F)$. According to Sylvester's Law, every congruence class of real symmetric matrices contains exactly one matrix of the form:
    A.  An upper triangular matrix
    B.  A diagonal matrix with entries $1, -1, 0$
    C.  A matrix with determinant 1
    D.  An orthogonal matrix
    E.  A skew-symmetric matrix
    ans: B

3.  The Symplectic Group $Sp_{2n}(\mathbb{R})$ is defined as the stabilizer of the standard skew-symmetric matrix $J$. What is the defining equation for $P \in Sp_{2n}(\mathbb{R})$?
    A.  $P^t P = I$
    B.  $P^* P = I$
    C.  $P^t J P = J$
    D.  $P J P^t = J$
    E.  $\det(P) = 1$
    ans: C

4.  The Unitary Group $U_n = \{P \in GL_n(\mathbb{C}) \mid P^*P = I\}$ is the stabilizer of the identity matrix $I$ under which operation involving $P \in GL_n(\mathbb{C})$?
    A.  $P, A \mapsto P^t A P$
    B.  $P, A \mapsto P^{-1} A P$
    C.  $P, A \mapsto (P^t)^{-1} A P^{-1}$
    D.  $P, A \mapsto (P^*)^{-1} A P^{-1}$
    E.  $P, A \mapsto P A P^*$
    ans: D

5.  The Special Linear Group $SL_n(\mathbb{R})$ consists of $n \times n$ real matrices $P$ such that:
    A.  $P^t P = I$
    B.  $P$ is invertible
    C.  $P$ is symmetric
    D.  $\det(P) = 1$
    E.  $P^2 = I$
    ans: D

6.  The Special Unitary Group $SU_n$ is defined as:
    A.  $SL_n(\mathbb{C}) \cap U_n$
    B.  $SL_n(\mathbb{R}) \cap O_n$
    C.  $\{ P \in U_n \mid \text{trace}(P) = 0 \}$
    D.  $\{ P \in GL_n(\mathbb{C}) \mid P = P^* \}$
    E.  $\{ P \in SL_n(\mathbb{C}) \mid P^t P = I \}$
    ans: A

7.  Which statement about the determinant of symplectic matrices $P \in Sp_{2n}(\mathbb{R})$ is true?
    A.  $\det(P) = \pm 1$
    B.  $\det(P) = 1$
    C.  $\det(P)$ can be any non-zero real number.
    D.  $\det(P) = -1$
    E.  $\det(P) = 0$
    ans: B

8.  The group $U_1 = \{ p \in \mathbb{C}^* \mid p \bar{p} = 1 \}$ is homeomorphic to:
    A.  The real line $\mathbb{R}$
    B.  The punctured plane $\mathbb{C}^*$
    C.  The unit circle $S^1$ in $\mathbb{R}^2$
    D.  The group $SO_3$
    E.  A single point
    ans: C

9.  A matrix $P \in SU_2$ can be written in the form $P = \begin{pmatrix} a & b \\ -\bar{b} & \bar{a} \end{pmatrix}$. What condition must the complex numbers $a, b$ satisfy?
    A.  $a\bar{a} - b\bar{b} = 1$
    B.  $a\bar{a} + b\bar{b} = 1$
    C.  $a^2 + b^2 = 1$
    D.  $a = \bar{a}$ and $b = -\bar{b}$
    E.  $ab - (-\bar{b})\bar{a} = 1$
    ans: B

10. The special unitary group $SU_2$ is homeomorphic to which geometric object?
    A.  The unit circle $S^1$
    B.  The 2-sphere $S^2$
    C.  The 3-sphere $S^3$
    D.  The torus $S^1 \times S^1$
    E.  Real projective space $\mathbb{R}P^3$
    ans: C

11. The conjugacy classes in $SU_2$, except for $\{I\}$ and $\{-I\}$, correspond geometrically to:
    A.  Great circles (longitudes)
    B.  2-spheres (latitudes) defined by a constant trace value
    C.  Single points
    D.  Tori
    E.  The entire group $SU_2$
    ans: B

12. The center $Z$ of the group $SU_2$ is:
    A.  $\{I\}$
    B.  $T = \{ \text{diag}(\lambda, \bar{\lambda}) \}$
    C.  $\{\pm I\}$
    D.  $SU_2$ itself
    E.  The set of matrices with trace 0
    ans: C

13. The "longitudes" in $SU_2$ are defined as intersections of $SU_2$ with 2-dimensional real subspaces of $\mathbb{R}^4$ containing the poles $\pm I$. Algebraically, they are:
    A.  The conjugacy classes (latitudes)
    B.  The subgroups conjugate to the diagonal subgroup $T$
    C.  The one-parameter subgroups
    D.  The center $\{\pm I\}$
    E.  Subsets where $x_1=0$.
    ans: B

14. The orthogonal representation of $SU_2$ is a homomorphism $\varphi: SU_2 \to SO_3$. What is the kernel of this homomorphism?
    A.  $\{I\}$
    B.  $\{\pm I\}$
    C.  The diagonal subgroup $T$
    D.  $SO_2$
    E.  $SU_2$ itself
    ans: B

15. The homomorphism $\varphi: SU_2 \to SO_3$ shows that $SU_2$ is a double cover of $SO_3$. This implies that $SO_3$ is homeomorphic to:
    A.  The 3-sphere $S^3$
    B.  The product $S^2 \times S^1$
    C.  The real projective 3-space $\mathbb{R}P^3$
    D.  $SU_2 \times \{\pm 1\}$
    E.  The group $SL_2(\mathbb{R})$
    ans: C

16. The space $V$ of trace-zero, $2 \times 2$ skew-hermitian matrices is a real vector space of dimension 3. The action of $P \in SU_2$ on $A \in V$ by conjugation, $A \mapsto PAP^*$, preserves the bilinear form $\langle A, A' \rangle$ defined as:
    A.  $\text{trace}(AA')$
    B.  $\det(A+A')$
    C.  $\text{trace}(A^*A')$
    D.  $-\frac{1}{2} \text{trace}(AA')$
    E.  $\det(A)\det(A')$
    ans: D

17. The Hopf fibration refers to the partition of the 3-sphere $SU_2$ into:
    A.  Conjugacy classes (latitudes)
    B.  Longitudes (conjugates of T)
    C.  Left cosets of the diagonal subgroup $T$ (great circles)
    D.  One-parameter subgroups
    E.  Fibres of the map $\varphi: SU_2 \to SO_3$
    ans: C

18. The special linear group $SL_2(\mathbb{R})$ is homeomorphic to which product space?
    A.  $S^3 \times \mathbb{R}$
    B.  $S^1 \times S^1$
    C.  $S^1 \times \mathbb{R}^2$
    D.  $\mathbb{R}^3$
    E.  $SO_3 \times \mathbb{R}$
    ans: C

19. There is a homomorphism $\varphi: SL_2(\mathbb{R}) \to O_{2,1}$ defined by the conjugation action on the space $W$ of $2 \times 2$ real trace-zero matrices. The kernel of this homomorphism is:
    A.  $\{I\}$
    B.  $\{\pm I\}$
    C.  $SO_2$
    D.  The group $H$ of upper triangular matrices in $SL_2(\mathbb{R})$
    E.  $SL_2(\mathbb{R})$ itself
    ans: B

20. The image of the homomorphism $\varphi: SL_2(\mathbb{R}) \to O_{2,1}$ is:
    A.  The entire Lorentz group $O_{2,1}$
    B.  The identity component $O_{2,1}^0$
    C.  $SO_{2,1}$ (matrices in $O_{2,1}$ with determinant 1)
    D.  A discrete subgroup
    E.  The trivial group $\{I\}$
    ans: B

21. A one-parameter subgroup of $GL_n$ is a differentiable homomorphism $\varphi: \mathbb{R}^+ \to GL_n$. Any such homomorphism is of the form $\varphi(t) = e^{tA}$ for some $n \times n$ matrix $A$. What is $A$?
    A.  $\varphi(1)$
    B.  $\varphi'(1)$
    C.  $\varphi'(0)$
    D.  $\int_0^1 \varphi(t) dt$
    E.  $\log(\varphi(1))$
    ans: C

22. The matrix exponential function maps a small neighborhood of $0$ in $\mathbb{R}^{n \times n}$ homeomorphically to a neighborhood of $I$ in $GL_n$. This is a consequence of:
    A.  Cayley-Hamilton Theorem
    B.  Spectral Theorem
    C.  Inverse Function Theorem
    D.  Sylvester's Law of Inertia
    E.  Gram-Schmidt Procedure
    ans: C

23. The one-parameter subgroups of the orthogonal group $O_n(\mathbb{R})$ are of the form $e^{tA}$ where $A$ is:
    A.  Any real $n \times n$ matrix
    B.  A symmetric matrix
    C.  An orthogonal matrix
    D.  A skew-symmetric matrix
    E.  A matrix with trace 0
    ans: D

24. The one-parameter subgroups of the special linear group $SL_n(\mathbb{R})$ are of the form $e^{tA}$ where $A$ is:
    A.  Any real $n \times n$ matrix
    B.  A symmetric matrix
    C.  An orthogonal matrix
    D.  A skew-symmetric matrix
    E.  A matrix with trace 0
    ans: E

25. The relationship $e^{\text{tr}(A)} = \det(e^A)$ holds for any complex matrix $A$. This is used to show that if $\text{trace}(A)=0$, then $\det(e^{tA})=1$. This formula relies on the property that if $\lambda_1, \dots, \lambda_n$ are eigenvalues of $A$, then the eigenvalues of $e^A$ are:
    A.  $\lambda_1, \dots, \lambda_n$
    B.  $e^{\lambda_1}, \dots, e^{\lambda_n}$
    C.  $1+\lambda_1, \dots, 1+\lambda_n$
    D.  $t\lambda_1, \dots, t\lambda_n$ for $e^{tA}$
    E.  $(\lambda_1)^t, \dots, (\lambda_n)^t$
    ans: B

26. The Lie algebra $\mathfrak{g}$ of a linear group $G$ is defined as:
    A.  The set of one-parameter subgroups of $G$.
    B.  The group $G$ itself considered as a vector space.
    C.  The set of matrices $A$ such that $e^{tA} \in G$ for all $t$.
    D.  The space of tangent vectors to $G$ at the identity matrix $I$.
    E.  The center of $G$.
    ans: D

27. For a real algebraic group $G$ defined by polynomial equations $f(P)=0$, a matrix $A$ represents an infinitesimal tangent vector at $I$ if:
    A.  $f(A) = 0$
    B.  $f(e^{tA}) = 0$ for all $t$
    C.  $f(I + A\epsilon) = 0$ (where $\epsilon^2 = 0$)
    D.  $A$ is in the kernel of $f$
    E.  $\nabla f(I) \cdot A = 0$
    ans: C

28. The Lie algebra of $SL_n(\mathbb{R})$, denoted $\mathfrak{sl}_n(\mathbb{R})$, consists of all real $n \times n$ matrices $A$ such that:
    A.  $A$ is invertible
    B.  $\det(A) = 0$
    C.  $\text{trace}(A) = 0$
    D.  $A$ is skew-symmetric
    E.  $A$ is symmetric
    ans: C

29. The Lie algebra of $O_n(\mathbb{R})$, denoted $\mathfrak{o}_n(\mathbb{R})$ or $\mathfrak{so}_n(\mathbb{R})$, consists of all real $n \times n$ matrices $A$ such that:
    A.  $A$ is orthogonal
    B.  $\det(A) = 0$
    C.  $\text{trace}(A) = 0$
    D.  $A$ is skew-symmetric ($A^t = -A$)
    E.  $A$ is symmetric ($A^t = A$)
    ans: D

30. For a real algebraic group $G$, which inclusion relationship between the set of generators of one-parameter subgroups (Exp(G)), the Lie algebra (tangent space at I, Lie(G)), and the set of infinitesimal tangents (Inf(G)) generally holds?
    A.  Lie(G) $\subseteq$ Inf(G) $\subseteq$ Exp(G)
    B.  Inf(G) $\subseteq$ Lie(G) $\subseteq$ Exp(G)
    C.  Exp(G) = Lie(G) = Inf(G)
    D.  Exp(G) $\subseteq$ Lie(G) $\subseteq$ Inf(G)
    E.  Lie(G) $\subseteq$ Exp(G) $\subseteq$ Inf(G)
    ans: D

31. The Lie bracket of two matrices $A, B$ in a Lie algebra is defined as:
    A.  $A+B$
    B.  $ABA^{-1}B^{-1}$
    C.  $AB+BA$
    D.  $A^t B - B^t A$
    E.  $[A, B] = AB - BA$
    ans: E

32. The Jacobi identity for a Lie bracket is:
    A.  $[A, B] = -[B, A]$
    B.  $[A, [B, C]] = [[A, B], C]$
    C.  $[A, I] = 0$
    D.  $[A, [B, C]] + [B, [C, A]] + [C, [A, B]] = 0$
    E.  $[A+B, C] = [A, C] + [B, C]$
    ans: D

33. If $G=SL_n(\mathbb{R})$, its Lie algebra $\mathfrak{sl}_n(\mathbb{R})$ consists of trace zero matrices. If $A, B \in \mathfrak{sl}_n(\mathbb{R})$, is $[A, B] = AB - BA$ also in $\mathfrak{sl}_n(\mathbb{R})$?
    A.  Yes, always.
    B.  No, not generally.
    C.  Only if $A$ and $B$ commute.
    D.  Only if $n=2$.
    E.  Only if $A$ or $B$ is zero.
    ans: A

34. Left translation $m_P(X) = PX$ in a matrix group $G$ is:
    A.  A group homomorphism
    B.  A linear transformation
    C.  A homeomorphism $G \to G$
    D.  An isometry only if $P$ is orthogonal
    E.  Always fixes the identity element
    ans: C

35. A key property of matrix groups that allows topology to be useful is homogeneity, meaning the group "looks the same" near any two points. This is a direct consequence of:
    A.  The existence of the identity element.
    B.  The associativity of matrix multiplication.
    C.  The existence of inverses.
    D.  The existence of left (and right) translation homeomorphisms.
    E.  The fact that matrix entries are real or complex numbers.
    ans: D

36. A manifold $M$ of dimension $d$ is a topological space such that every point $p \in M$:
    A.  Is isolated.
    B.  Has a neighborhood homeomorphic to an open set in $\mathbb{R}^d$.
    C.  Is the limit of a sequence in $\mathbb{R}^d$.
    D.  Satisfies a set of $d$ linear equations.
    E.  Is fixed by some group action.
    ans: B

37. Theorem (7.4) states that a subgroup $G$ of $GL_n(\mathbb{R})$ which is also a closed set in $\mathbb{R}^{n \times n}$ is:
    A.  A finite group
    B.  A discrete group
    C.  A manifold
    D.  Abelian
    E.  Connected
    ans: C

38. The orthogonal group $O_n$ is a manifold. Its dimension is:
    A.  $n^2$
    B.  $n$
    C.  $n(n+1)/2$
    D.  $n(n-1)/2$
    E.  1
    ans: D

39. If $G$ is a path-connected matrix group and $H$ is a subgroup that contains a non-empty open subset of $G$, then:
    A.  $H$ must be the identity subgroup.
    B.  $H$ must be a normal subgroup.
    C.  $H$ must be equal to $G$.
    D.  $H$ must be discrete.
    E.  $G/H$ must be finite.
    ans: C

40. What is the only proper normal subgroup of $SU_2$?
    A.  The trivial subgroup $\{I\}$
    B.  The center $Z = \{\pm I\}$
    C.  The subgroup $T$ of diagonal matrices
    D.  Any longitude subgroup
    E.  $SU_2$ has no proper normal subgroups (it is simple).
    ans: B

41. The rotation group $SO_3$ is:
    A.  Abelian
    B.  Simple
    C.  Cyclic
    D.  Has center $\{\pm I\}$
    E.  Isomorphic to $SU_2$
    ans: B

42. A group $G$ is called simple if its only normal subgroups are:
    A.  $\{e\}$ and $G$ itself (and $G \ne \{e\}$)
    B.  Abelian subgroups
    C.  Cyclic subgroups
    D.  The center $Z(G)$
    E.  Subgroups of prime order
    ans: A

43. Which of the following complex linear groups $G/Z$ (where Z is the center) is NOT simple?
    A.  $PSL_3(\mathbb{C})$
    B.  $SO_4(\mathbb{C})/Z$
    C.  $SO_5(\mathbb{C})$ (since $Z=\{I\}$)
    D.  $PSp_4(\mathbb{C})$
    E.  $PSL_2(\mathbb{C})$
    ans: B

44. Theorem (8.3) states that $PSL_2(F) = SL_2(F)/\{\pm I\}$ is a simple group, provided the field $F$ satisfies which conditions?
    A.  $F = \mathbb{R}$ or $F = \mathbb{C}$.
    B.  $F$ is finite.
    C.  Characteristic of $F$ is 0.
    D.  Characteristic of $F$ is not 2, and $|F| \ge 7$.
    E.  $F$ is algebraically closed.
    ans: D

45. The group $SL_2(F)$ is generated by which types of matrices?
    A.  Diagonal matrices
    B.  Rotation matrices
    C.  Reflections
    D.  Matrices of the form $\begin{pmatrix} 1 & u \\ 0 & 1 \end{pmatrix}$ and $\begin{pmatrix} 1 & 0 \\ u & 1 \end{pmatrix}$
    E.  Permutation matrices
    ans: D

46. The classification of finite simple groups includes groups of prime order, alternating groups $A_n (n \ge 5)$, groups of Lie type, and:
    A.  Cyclic groups of composite order
    B.  Dihedral groups
    C.  26 sporadic groups
    D.  All solvable groups
    E.  Nilpotent groups
    ans: C

47. The smallest non-abelian simple group is $A_5$. Its order is 60. It is isomorphic to which projective special linear group?
    A.  $PSL_2(\mathbb{F}_3)$
    B.  $PSL_2(\mathbb{F}_4)$
    C.  $PSL_2(\mathbb{F}_5)$
    D.  $PSL_2(\mathbb{F}_7)$
    E.  $PSL_3(\mathbb{F}_2)$
    ans: C

### Chapter 9: Group Representations

1.  A matrix representation of a group G over a field F is formally defined as:
    A.  A group G whose elements are matrices.
    B.  A vector space V on which G acts.
    C.  A homomorphism $R: G \to GL_n(F)$.
    D.  An injective map from G to a set of matrices.
    E.  A bijective map $R: G \to GL_n(F)$.
    ans: C

2.  A representation $\rho: G \to GL(V)$ is called faithful if:
    A.  $\rho$ is surjective.
    B.  $\rho$ is injective (its kernel is trivial).
    C.  V is a real vector space.
    D.  All operators $\rho_g$ are unitary.
    E.  The dimension of V is equal to the order of G.
    ans: B

3.  If $R: G \to GL_n(F)$ is a matrix representation associated with $\rho: G \to GL(V)$ and basis B, how does the matrix representation $R'$ with respect to a new basis $B'$ relate to $R$, if $P$ is the change-of-basis matrix from $B'$ to $B$ ($B=B'P$)?
    A.  $R'_g = P R_g P^{-1}$
    B.  $R'_g = P^{-1} R_g P$
    C.  $R'_g = P^T R_g P$
    D.  $R'_g = P R_g P^T$
    E.  $R'_g = R_g$
    ans: B

4.  An operation of a group G on a vector space V requires that $1v = v$, $(gh)v = g(hv)$ and additionally that for all $g \in G$:
    A.  $g$ preserves the norm of $v$.
    B.  $g(v+w) = gv + gw$ and $g(cv) = cgv$.
    C.  $gv = v$ for all $v$.
    D.  $gv = \lambda v$ for some scalar $\lambda$.
    E.  $g$ maps $V$ to a different vector space.
    ans: B

5.  A complex matrix representation $R: G \to GL_n(\mathbb{C})$ is called unitary if:
    A.  All matrices $R_g$ have determinant 1.
    B.  All matrices $R_g$ are Hermitian ($R_g^* = R_g$).
    C.  The image of R is contained in the unitary group $U_n$.
    D.  All matrices $R_g$ are real orthogonal matrices.
    E.  The representation is irreducible.
    ans: C

6.  Theorem (2.2b) states that every matrix representation $R: G \to GL_n(\mathbb{C})$ of a finite group G is:
    A.  Faithful.
    B.  Conjugate to a representation by diagonal matrices.
    C.  Conjugate to a unitary representation.
    D.  Already unitary.
    E.  One-dimensional.
    ans: C

7.  A consequence of Theorem (2.2) is that for any representation $R$ of a finite group G, every matrix $R_g$ is:
    A.  Hermitian
    B.  Unitary
    C.  Diagonalizable
    D.  Orthogonal
    E.  Of infinite order
    ans: C

8.  Given a representation $\rho$ of G on V, a hermitian form $\langle \cdot, \cdot \rangle$ on V is called G-invariant if for all $v, w \in V$ and $g \in G$:
    A.  $\langle gv, w \rangle = \langle v, g^{-1}w \rangle$
    B.  $\langle v, w \rangle = \langle gv, gw \rangle$
    C.  $\langle gv, gw \rangle = g \langle v, w \rangle$
    D.  $\langle v, w \rangle = 0$
    E.  $\langle gv, v \rangle = \langle v, gv \rangle$
    ans: B

9.  Theorem (2.6) states that for any representation $\rho$ of a finite group G on a complex vector space V, there exists:
    A.  A basis in which all $\rho_g$ are diagonal.
    B.  A G-invariant subspace of dimension 1.
    C.  A G-invariant, positive definite hermitian form on V.
    D.  A non-trivial kernel for $\rho$.
    E.  A unique G-invariant subspace.
    ans: C

10. The method used to prove Theorem (2.6) involves starting with an arbitrary positive definite hermitian form $\{\cdot, \cdot\}$ and defining a new form $\langle \cdot, \cdot \rangle$ by:
    A.  Taking the real part: $\langle v, w \rangle = \text{Re}\{v, w\}$.
    B.  Averaging over the group: $\langle v, w \rangle = \frac{1}{|G|} \sum_{g \in G} \{gv, gw\}$.
    C.  Diagonalizing the form matrix.
    D.  Restricting the form to a subspace.
    E.  Using the Gram-Schmidt process.
    ans: B

11. A linear group G is called compact if:
    A.  It is a finite group.
    B.  It is abelian.
    C.  As a subset of the space of matrices, it is closed and bounded.
    D.  All its representations are irreducible.
    E.  It is isomorphic to $SO(n)$ or $SU(n)$ for some n.
    ans: C

12. The averaging technique used for finite groups can be extended to compact groups by replacing summation with:
    A.  Taking the limit.
    B.  Differentiation.
    C.  Integration with respect to Haar measure.
    D.  Matrix exponentiation.
    E.  Trace calculation.
    ans: C

13. A subspace W of V is called G-invariant for a representation $\rho: G \to GL(V)$ if:
    A.  $gw = w$ for all $w \in W, g \in G$.
    B.  $gw \in W$ for all $w \in W, g \in G$.
    C.  $W = V$ or $W = \{0\}$.
    D.  $\rho_g|_W$ is the identity map for all $g \in G$.
    E.  W is orthogonal to $gW$ for all $g \in G$.
    ans: B

14. A representation $\rho$ on a non-zero vector space V is irreducible if:
    A.  It is faithful.
    B.  It is unitary.
    C.  Its dimension is 1.
    D.  It has no proper G-invariant subspaces (only $\{0\}$ and V).
    E.  It is a direct sum of other representations.
    ans: D

15. If $V = W_1 \oplus W_2$ where $W_1, W_2$ are G-invariant subspaces, and $\rho_i$ is the restriction of $\rho$ to $W_i$, then $\rho$ is the direct sum $\rho_1 \oplus \rho_2$. In a compatible basis, the matrix $R_g$ has the form:
    A.  Diagonal
    B.  Upper triangular
    C.  Block diagonal $\begin{pmatrix} A_g & 0 \\ 0 & B_g \end{pmatrix}$
    D.  Scalar multiple of identity
    E.  Jordan block
    ans: C

16. Proposition (4.7) states that if $\rho$ is a unitary representation on V and W is a G-invariant subspace, then its orthogonal complement $W^\perp$ is:
    A.  Also G-invariant.
    B.  The zero subspace.
    C.  Not necessarily G-invariant.
    D.  Equal to W.
    E.  Mapped to W by G.
    ans: A

17. Maschke's Theorem (Corollary 4.9) states that every representation of a finite group G (over $\mathbb{C}$) is:
    A.  Irreducible.
    B.  Unitary.
    C.  Faithful.
    D.  A direct sum of irreducible representations.
    E.  One-dimensional.
    ans: D

18. Two representations $\rho: G \to GL(V)$ and $\rho': G \to GL(V')$ are isomorphic if there exists an isomorphism $T: V \to V'$ such that:
    A.  $T \rho_g = \rho'_g T$ for all $g \in G$.
    B.  $T$ maps G-invariant subspaces to G-invariant subspaces.
    C.  $\rho_g$ and $\rho'_g$ have the same matrix for all $g \in G$.
    D.  $\text{trace}(\rho_g) = \text{trace}(\rho'_g)$ for all $g \in G$.
    E.  $V$ and $V'$ have the same dimension.
    ans: A

19. The character $\chi$ of a representation $\rho: G \to GL(V)$ is a function $\chi: G \to \mathbb{C}$ defined by:
    A.  $\chi(g) = \det(\rho_g)$
    B.  $\chi(g) = \text{dimension of } V$
    C.  $\chi(g) = \text{trace}(\rho_g)$
    D.  $\chi(g) = 1$ if $g$ is identity, 0 otherwise.
    E.  $\chi(g) = \rho_g$
    ans: C

20. Which property is NOT generally true for a character $\chi$ of a representation $\rho$ of a finite group G?
    A.  $\chi(1) = \dim V$.
    B.  $\chi(hgh^{-1}) = \chi(g)$ (Character is a class function).
    C.  $\chi(g^{-1}) = \overline{\chi(g)}$.
    D.  $\chi(gh) = \chi(g)\chi(h)$.
    E.  The character of $\rho_1 \oplus \rho_2$ is $\chi_1 + \chi_2$.
    ans: D

21. The hermitian product $\langle \chi, \chi' \rangle$ for characters (or class functions) is defined as:
    A.  $\sum_{g \in G} \chi(g) \chi'(g)$
    B.  $\frac{1}{|G|} \sum_{g \in G} \chi(g) \overline{\chi'(g)}$
    C.  $\chi(1)\chi'(1)$
    D.  $\int_G \chi(g) \overline{\chi'(g)} dg$
    E.  $\max_{g \in G} |\chi(g) - \chi'(g)|$
    ans: B

22. The first Orthogonality Relation (Theorem 5.9a) states that the irreducible characters $\chi_1, \dots, \chi_r$ of a finite group G are:
    A.  Linearly dependent.
    B.  Orthogonal but not necessarily normalized.
    C.  Orthonormal with respect to the hermitian product $\langle \cdot, \cdot \rangle$.
    D.  All equal to the trivial character.
    E.  Real-valued functions.
    ans: C

23. Theorem (5.9b) states that the number of isomorphism classes of irreducible representations of a finite group G is equal to:
    A.  The order of the group $|G|$.
    B.  The number of elements in G.
    C.  The number of conjugacy classes of G.
    D.  The dimension of the smallest faithful representation.
    E.  The number of generators of G.
    ans: C

24. Theorem (5.9c) relates the dimensions $d_i$ of the irreducible representations of a finite group G of order N to N itself by the formula:
    A.  $\sum_{i=1}^r d_i = N$
    B.  $\prod_{i=1}^r d_i = N$
    C.  $\sum_{i=1}^r d_i^2 = N$
    D.  $\sum_{i=1}^r d_i = \text{number of conjugacy classes}$
    E.  $N = d_1! + d_2! + \dots + d_r!$
    ans: C

25. A character $\chi$ corresponds to an irreducible representation if and only if:
    A.  $\chi(1) = 1$.
    B.  $\chi(g) \neq 0$ for all $g$.
    C.  $\langle \chi, \chi \rangle = 1$.
    D.  $\chi$ is the character of the regular representation.
    E.  $\chi(g)$ is real for all $g$.
    ans: C

26. If $\chi$ is any character and $\chi_1, \dots, \chi_r$ are the irreducible characters, then $\chi = \sum_{i=1}^r n_i \chi_i$, where the integer coefficient $n_i$ is given by:
    A.  $n_i = \chi(g_i)$ for some representative $g_i$.
    B.  $n_i = \langle \chi, \chi_i \rangle$.
    C.  $n_i = \chi_i(1)$.
    D.  $n_i = \dim(\chi) / \dim(\chi_i)$.
    E.  $n_i = \langle \chi_1, \chi_i \rangle$.
    ans: B

27. If two representations $\rho, \rho'$ have the same character, then they are:
    A.  Unitary
    B.  Irreducible
    C.  Isomorphic
    D.  Faithful
    E.  The regular representation
    ans: C

28. The character table of a group G lists the irreducible characters $\chi_i$ evaluated on representatives $g_j$ of the conjugacy classes $C_j$. The entry in row i, column j is $\chi_i(g_j)$. The size of the character table (number of rows/columns) is:
    A.  $|G| \times |G|$
    B.  $r \times r$, where r is the number of irreducible representations (or conjugacy classes).
    C.  $N \times r$, where N = |G|.
    D.  Depends on the dimensions $d_i$.
    E.  Always $3 \times 3$.
    ans: B

29. The representation associated with the operation of G on a set S is called the permutation representation. Its character $\chi(g)$ is equal to:
    A.  The dimension of the representation (which is $|S|$).
    B.  The number of orbits of G on S.
    C.  The number of elements in S fixed by g.
    D.  1 if g fixes at least one element, 0 otherwise.
    E.  The sign of the permutation induced by g.
    ans: C

30. Every permutation representation $\rho$ of G on $V(S)$ (where $|S|>1$) contains which representation as a direct summand?
    A.  The regular representation.
    B.  An irreducible representation of dimension $|S|-1$.
    C.  The sign representation.
    D.  The trivial representation (corresponding to the subspace spanned by $\sum s_i$).
    E.  A faithful representation.
    ans: D

31. The regular representation $\rho_{reg}$ of G is the permutation representation associated with the action of G on:
    A.  Itself (S=G) by conjugation.
    B.  Itself (S=G) by left multiplication.
    C.  The set of its subgroups.
    D.  The set of its conjugacy classes.
    E.  The trivial set {e}.
    ans: B

32. The character $\chi_{reg}$ of the regular representation of a finite group G of order N is:
    A.  $\chi_{reg}(g) = N$ for all $g$.
    B.  $\chi_{reg}(1)=N$, $\chi_{reg}(g)=0$ for $g \ne 1$.
    C.  $\chi_{reg}(g) = 1$ for all $g$.
    D.  $\chi_{reg}(1)=N$, $\chi_{reg}(g)=-1$ for $g \ne 1$.
    E.  $\chi_{reg}(g) = d_i$ if $g$ is in the $i$-th conjugacy class.
    ans: B

33. The decomposition of the regular representation into irreducibles is given by $\rho_{reg} \approx \bigoplus_{i=1}^r d_i \rho_i$, where $d_i = \chi_i(1)$ is the dimension of the i-th irreducible representation $\rho_i$. This means its character decomposes as:
    A.  $\chi_{reg} = \sum_{i=1}^r \chi_i$
    B.  $\chi_{reg} = d_1 \chi_1$
    C.  $\chi_{reg} = \sum_{i=1}^r d_i \chi_i$
    D.  $\chi_{reg} = \chi_1$ (the trivial character)
    E.  $\chi_{reg} = N \chi_1$
    ans: C

34. A one-dimensional representation $\rho: G \to GL_1(\mathbb{C}) = \mathbb{C}^\times$ has a character $\chi$ which is also a homomorphism, i.e., $\chi(gh) = \chi(g)\chi(h)$. Such a character is called:
    A.  Irreducible
    B.  Abelian
    C.  Faithful
    D.  Regular
    E.  Unitary
    ans: B

35. If G is a finite abelian group, then all its irreducible representations are:
    A.  Faithful
    B.  Unitary
    C.  Of dimension > 1
    D.  One-dimensional
    E.  Isomorphic to the regular representation
    ans: D

36. Schur's Lemma (part a) states that if $\rho, \rho'$ are irreducible representations of G on V, V' and $T: V \to V'$ is a G-invariant linear transformation, then:
    A.  T must be unitary.
    B.  $T = cI$ for some scalar $c$.
    C.  Either $T=0$ or T is an isomorphism.
    D.  $T$ is the orthogonal projection onto an invariant subspace.
    E.  The kernel of T is G-invariant.
    ans: C

37. Schur's Lemma (part b) states that if $\rho$ is an irreducible representation of G on V and $T: V \to V$ is a G-invariant linear operator, then:
    A.  T must be unitary.
    B.  $T = cI$ for some scalar $c$.
    C.  Either $T=0$ or T is invertible.
    D.  T is the orthogonal projection onto V.
    E.  T is diagonalizable.
    ans: B

38. The proof of the orthogonality relations $\langle \chi, \chi' \rangle = 0$ for non-isomorphic irreducible characters relies on averaging an arbitrary linear map $A: V \to V'$ to produce a G-invariant map $\tilde{A}$ which must be zero by Schur's Lemma. $\tilde{A}$ is defined by:
    A.  $\tilde{A} = \frac{1}{|G|} \sum_g \rho'_g A \rho_g^{-1}$
    B.  $\tilde{A} = \frac{1}{|G|} \sum_g \rho'_{g^{-1}} A \rho_g$
    C.  $\tilde{A} = A$
    D.  $\tilde{A} = \text{trace}(A) I$
    E.  $\tilde{A} = A - A^*$
    ans: B

39. The representations of the circle group $U_1$ (or $SO(2)$) are indexed by integers $n \in \mathbb{Z}$, where the representation $\rho_n$ acts as:
    A.  $\rho_n(e^{i\theta}) = e^{i n \theta}$
    B.  $\rho_n(e^{i\theta}) = n e^{i \theta}$
    C.  $\rho_n(e^{i\theta}) = e^{i \theta / n}$
    D.  $\rho_n(e^{i\theta}) = \cos(n\theta)$
    E.  $\rho_n(e^{i\theta}) = n$
    ans: A

40. The irreducible representations of $SU(2)$ are indexed by non-negative integers $n=0, 1, 2, \dots$. The representation $\rho_n$ acts on the space $V_n$ of:
    A.  $n \times n$ matrices.
    B.  Polynomials of degree at most $n$.
    C.  Homogeneous polynomials of degree $n$ in two variables $u, v$.
    D.  Functions $f: SU(2) \to \mathbb{C}$.
    E.  Spinors of rank n.
    ans: C

41. The dimension of the irreducible representation $\rho_n$ of $SU(2)$ is:
    A.  n
    B.  $n^2$
    C.  $2n$
    D.  $n+1$
    E.  $2^n$
    ans: D

42. The character $\chi_n$ of the irreducible representation $\rho_n$ of $SU(2)$, when restricted to the diagonal subgroup $T = \{ \begin{pmatrix} \alpha & 0 \\ 0 & \bar{\alpha} \end{pmatrix} \mid |\alpha|=1 \}$, is given by $\chi_n(\alpha) =$:
    A.  $\alpha^n$
    B.  $\alpha^n + \alpha^{-n}$
    C.  $\alpha^n + \alpha^{n-2} + \dots + \alpha^{-n}$
    D.  $n+1$
    E.  $(\alpha^n - \alpha^{-n})/(\alpha - \alpha^{-1})$
    ans: C

43. Maschke's Theorem guarantees that representations of finite groups over $\mathbb{C}$ are completely reducible (direct sums of irreducibles). This theorem generally fails for representations over fields where:
    A.  The field is infinite.
    B.  The field characteristic divides the order of the group.
    C.  The field is not algebraically closed.
    D.  The field is $\mathbb{R}$.
    E.  The field is finite.
    ans: B

44. Frobenius Reciprocity relates induction and restriction of characters. If H is a subgroup of G, $\psi$ is a character of H, and $\chi$ is a character of G, it states:
    A.  $\langle \text{ind}_H^G \psi, \chi \rangle_G = \langle \psi, \text{res}_H^G \chi \rangle_H$
    B.  $\text{ind}_H^G (\text{res}_H^G \chi) = \chi$
    C.  $\text{res}_H^G (\text{ind}_H^G \psi) = \psi$
    D.  $\langle \text{ind}_H^G \psi, \chi \rangle_G = \langle \psi, \chi \rangle_H$
    E.  $\text{ind}_H^G \psi = \psi \otimes \chi_{G/H}$
    ans: A

### Chapter 10: Rings

1.  According to the text's convention, a "ring" R is defined as a set with two laws of composition, addition and multiplication, such that:
    A.  R is an abelian group under addition, multiplication is associative, and the distributive laws hold.
    B.  R is a group under addition, multiplication is associative with an identity, and distributive laws hold.
    C.  R is an abelian group under addition with identity 0, multiplication is associative with identity 1, distributive laws hold, and multiplication is commutative.
    D.  R is a field, but potentially without multiplicative inverses for all non-zero elements.
    E.  R is an abelian group under addition, and multiplication is associative and commutative.
    ans: C

2.  The set of Gauss integers, $\mathbb{Z}[i]$, consists of complex numbers of the form:
    A.  $a + b\sqrt{2}$, where $a, b \in \mathbb{Z}$
    B.  $a + bi$, where $a, b \in \mathbb{Z}$
    C.  $a + bi$, where $a, b \in \mathbb{Q}$
    D.  Polynomials in $i$ with integer coefficients.
    E.  Both B and D are equivalent descriptions.
    ans: E

3.  A complex number $\alpha$ is called algebraic if:
    A.  It can be written as $a+bi$ where $a,b \in \mathbb{Q}$.
    B.  It is a root of some polynomial with integer coefficients.
    C.  It belongs to the ring $\mathbb{Z}[\alpha]$.
    D.  It is not transcendental.
    E.  Both B and D are equivalent definitions.
    ans: E

4.  Which of the following is NOT a ring (under standard operations, assuming the text's default definition)?
    A.  The set of integers $\mathbb{Z}$.
    B.  The set of $n \times n$ real matrices $\mathbb{R}^{n \times n}$.
    C.  The set of continuous real-valued functions on $[0,1]$.
    D.  The set of natural numbers $\mathbb{N} = \{1, 2, 3, ...\}$.
    E.  Any field.
    ans: D

5.  An element $u$ in a ring $R$ is called a unit if:
    A.  $u \neq 0$.
    B.  $u = 1$.
    C.  $u$ has a multiplicative inverse in $R$.
    D.  $u$ is not a zero divisor.
    E.  $ur = r$ for all $r \in R$.
    ans: C

6.  The zero ring $R = \{0\}$ is the only ring where:
    A.  Multiplication is not associative.
    B.  The distributive laws fail.
    C.  $1 = 0$.
    D.  There are no units.
    E.  Every element is its own additive inverse.
    ans: C

7.  Which property is NOT one of Peano's axioms for the natural numbers $\mathbb{N}$?
    A.  $\mathbb{N}$ contains an element 1.
    B.  There is an injective successor map $\sigma: \mathbb{N} \to \mathbb{N}$.
    C.  $\sigma(n) \neq 1$ for any $n \in \mathbb{N}$.
    D.  Every natural number $n \neq 1$ is a successor, $n = m'$ for some $m$.
    E.  The induction axiom holds.
    ans: D

8.  Using the recursive definitions $m+1=m'$ and $m+n'=(m+n)'$, the proof of the associative law for addition $(a+b)+n = a+(b+n)$ relies on:
    A.  The definition of multiplication.
    B.  The cancellation law.
    C.  Induction on $n$.
    D.  The existence of additive inverses.
    E.  The commutativity of multiplication.
    ans: C

9.  A formal polynomial $f(x) = a_n x^n + \dots + a_0$ with coefficients in a ring $R$ can be uniquely represented by:
    A.  Its set of roots in $R$.
    B.  Its sequence of coefficients $(a_0, a_1, \dots, a_n, 0, \dots)$ where only finitely many are non-zero.
    C.  Its value $f(1)$.
    D.  Its degree $n$.
    E.  Its leading coefficient $a_n$.
    ans: B

10. The degree of the product of two non-zero polynomials $f(x)$ and $g(x)$ in $R[x]$ is:
    A.  Always $\deg(f) + \deg(g)$.
    B.  $\deg(f) + \deg(g)$ if $R$ is an integral domain.
    C.  At most $\deg(f) + \deg(g)$.
    D.  $\max(\deg(f), \deg(g))$.
    E.  Both B and C are true.
    ans: E

11. The ring of polynomials in $n$ variables $R[x_1, \dots, x_n]$ is often denoted by:
    A.  $R[x^n]$
    B.  $R(x_1, \dots, x_n)$
    C.  $R[\mathbf{x}]$
    D.  $P_n(R)$
    E.  $R[[x_1, \dots, x_n]]$
    ans: C

12. A ring homomorphism $\phi: R \to R'$ must satisfy $\phi(a+b) = \phi(a) + \phi(b)$, $\phi(ab) = \phi(a)\phi(b)$, and:
    A.  $\phi(0_R) = 0_{R'}$
    B.  $\phi(1_R) = 1_{R'}$
    C.  $\phi$ must be injective.
    D.  $\phi$ must be surjective.
    E.  $\ker \phi = \{0_R\}$.
    ans: B

13. The Substitution Principle states that for a ring homomorphism $\phi: R \to R'$ and an element $\alpha \in R'$, there is a unique homomorphism $\Phi: R[x] \to R'$ such that $\Phi$ agrees with $\phi$ on $R$ (constants) and:
    A.  $\Phi(x) = 0$
    B.  $\Phi(x) = 1_{R'}$
    C.  $\Phi(x) = \alpha$
    D.  $\Phi(f(x)) = f(\phi(\alpha))$
    E.  $\Phi$ is surjective.
    ans: C

14. The kernel of a ring homomorphism $\phi: R \to R'$ is:
    A.  A subring of R.
    B.  A subring of R'.
    C.  The set $\{ r \in R \mid \phi(r) = 0_{R'} \}$.
    D.  The set $\{ r' \in R' \mid r' = \phi(r) \text{ for some } r \in R \}$.
    E.  Always the zero ideal $\{0_R\}$.
    ans: C

15. An ideal $I$ of a ring $R$ is a subset satisfying: (i) $I$ is a subgroup of $(R, +)$ and (ii)...
    A.  $I$ is closed under multiplication.
    B.  $1_R \in I$.
    C.  For all $a \in I$ and $r \in R$, $ra \in I$.
    D.  For all $a \in I$, $a^{-1} \in I$.
    E.  $I$ is a subring.
    ans: C

16. The principal ideal generated by an element $a$ in a ring $R$, denoted $(a)$, is the set:
    A.  $\{a\}$
    B.  $\{a, -a, 1\}$
    C.  $\{ ra \mid r \in R \}$
    D.  $\{ r \in R \mid ra = 0 \}$
    E.  The smallest subring containing $a$.
    ans: C

17. Which statement characterizes fields in terms of ideals?
    A.  A ring $R$ is a field if and only if it has infinitely many ideals.
    B.  A ring $R$ is a field if and only if its only ideals are $\{0\}$ and $R$.
    C.  A ring $R$ is a field if and only if every ideal is principal.
    D.  A ring $R$ is a field if and only if the zero ideal is maximal.
    E.  Both B and D are correct.
    ans: E

18. Every ideal in the ring of integers $\mathbb{Z}$ is:
    A.  The zero ideal.
    B.  Maximal.
    C.  Finite.
    D.  Principal.
    E.  Generated by a prime number.
    ans: D

19. The characteristic of a ring $R$ is the non-negative integer $n$ such that:
    A.  $n$ is the number of elements in $R$.
    B.  $a^n = a$ for all $a \in R$.
    C.  $n \cdot a = 0$ for all $a \in R$.
    D.  $n$ generates the kernel of the unique homomorphism $\phi: \mathbb{Z} \to R$.
    E.  $n$ is the smallest positive integer such that $n \cdot 1_R = 0$ (or 0 if no such positive integer exists).
    ans: E

20. Division with remainder in $R[x]$: Given $g(x), f(x) \in R[x]$, there exist unique $q(x), r(x)$ such that $g(x) = f(x)q(x) + r(x)$ and $\deg(r) < \deg(f)$ or $r=0$, provided that:
    A.  $R$ is a field.
    B.  The leading coefficient of $f(x)$ is a unit in $R$.
    C.  $f(x)$ is monic.
    D.  $R$ is an integral domain.
    E.  Both B and C ensure the condition is met.
    ans: E

21. Every ideal in the polynomial ring $F[x]$, where $F$ is a field, is:
    A.  Maximal.
    B.  The zero ideal.
    C.  Generated by $x$.
    D.  Principal.
    E.  Generated by a linear polynomial.
    ans: D

22. Let $I$ be an ideal of a ring $R$. The elements of the quotient ring $R/I$ are:
    A.  The elements of $I$.
    B.  The elements of $R$ not in $I$.
    C.  The cosets $a+I$ where $a \in R$.
    D.  Pairs $(r, i)$ where $r \in R, i \in I$.
    E.  Subgroups of $R$.
    ans: C

23. The product of two cosets $(a+I)(b+I)$ in the quotient ring $R/I$ is defined as:
    A.  $ab + I$
    B.  $(a+b) + I$
    C.  $aI + bI$
    D.  $\{rs \mid r \in a+I, s \in b+I\}$
    E.  $I$ if $ab \in I$, otherwise undefined.
    ans: A

24. The First Isomorphism Theorem for rings states that if $\phi: R \to R'$ is a ring homomorphism with kernel $I$, then:
    A.  $R/I \approx \ker \phi$
    B.  $R/R' \approx I$
    C.  $R \approx R'/I$
    D.  $R/I \approx \text{im } \phi$
    E.  $I \approx \text{im } \phi$
    ans: D

25. The Correspondence Theorem states there is a bijective correspondence between ideals of $R/I$ and:
    A.  All ideals of $R$.
    B.  Ideals of $R$ that are contained in $I$.
    C.  Ideals of $R$ that contain $I$.
    D.  Principal ideals of $R$.
    E.  Maximal ideals of $R$.
    ans: C

26. Introducing the relation $a=0$ into a ring $R$ corresponds to forming the quotient ring:
    A.  $R/\{0\}$
    B.  $R/(a)$, the principal ideal generated by $a$.
    C.  $R/R$
    D.  $R[x]/(x-a)$
    E.  $Z/(a)$
    ans: B

27. The ring $\mathbb{Z}[i]/(1+3i)$ is isomorphic to:
    A.  $\mathbb{Z}$
    B.  $\mathbb{Z}/(10)$
    C.  $\mathbb{Z}/(3)$
    D.  $\mathbb{F}_5$
    E.  $\mathbb{C}$
    ans: B

28. The ring $\mathbb{C}[x,y]/(xy)$ is isomorphic to the subring of $\mathbb{C}[x] \times \mathbb{C}[y]$ consisting of pairs $(p(x), q(y))$ such that:
    A.  $p(x) = q(y)$
    B.  $p(0) = q(0)$
    C.  $p(1) = q(1)$
    D.  $\deg(p) = \deg(q)$
    E.  $p(x)$ and $q(y)$ have the same constant term.
    ans: B

29. Adjoining an element $\alpha$ to a ring $R$ such that $\alpha$ satisfies $f(\alpha)=0$ for a polynomial $f(x) \in R[x]$ results in the ring:
    A.  $R[\alpha]$
    B.  $R[x]/(f(x))$
    C.  $R(x)$
    D.  $R[f(x)]$
    E.  Both A and B denote this ring.
    ans: E

30. The complex numbers $\mathbb{C}$ can be constructed as:
    A.  $\mathbb{R}[x]/(x^2 - 1)$
    B.  $\mathbb{R}[x]/(x^2)$
    C.  $\mathbb{R}[x]/(x^2+1)$
    D.  $\mathbb{Z}[x]/(x^2+1)$
    E.  $\mathbb{Q}[x]/(x^2+1)$
    ans: C

31. If $f(x)$ is a monic polynomial of degree $n$ in $R[x]$, the elements of $R[\alpha] = R[x]/(f(x))$ have a unique representation as:
    A.  $r_0 + r_1 \alpha + \dots + r_{n-1} \alpha^{n-1}$, where $r_i \in R$.
    B.  $r_n \alpha^n$.
    C.  $r(\alpha - c_1) \dots (\alpha - c_n)$ where $c_i$ are roots.
    D.  $p(\alpha)/q(\alpha)$ where $p, q \in R[x]$.
    E.  Vectors $(r_0, \dots, r_n)$ in $R^{n+1}$.
    ans: A

32. The ring $\mathbb{F}_5[x]/(x^2-3)$ is:
    A.  Not a ring.
    B.  A ring but not an integral domain.
    C.  An integral domain but not a field.
    D.  A field with 25 elements.
    E.  Isomorphic to $\mathbb{F}_5$.
    ans: D

33. An element $a$ in a ring $R$ is a zero divisor if:
    A.  $a=0$.
    B.  $a$ is not a unit.
    C.  There exists $b \neq 0$ in $R$ such that $ab=0$.
    D.  $a^n = 0$ for some $n > 0$.
    E.  $a \cdot 0 = a$.
    ans: C

34. An integral domain is a non-zero ring $R$ (so $1 \neq 0$) with the additional property that:
    A.  It is finite.
    B.  It has no zero divisors.
    C.  Every element is a unit.
    D.  It is a subring of $\mathbb{C}$.
    E.  The cancellation law holds for addition.
    ans: B

35. Which of the following is NOT an integral domain?
    A.  $\mathbb{Z}$
    B.  $\mathbb{F}_p$ (p prime)
    C.  $\mathbb{R}[x]$
    D.  $\mathbb{Z}/(6)$
    E.  Any field.
    ans: D

36. A finite integral domain is always:
    A.  Isomorphic to $\mathbb{Z}/(n)$ for some $n$.
    B.  A field.
    C.  Of characteristic 0.
    D.  The zero ring.
    E.  A polynomial ring.
    ans: B

37. The field of fractions of an integral domain $R$ is constructed using equivalence classes of pairs $(a, b)$ where $a, b \in R$ and:
    A.  $b$ is a unit.
    B.  $b \neq 0$.
    C.  $b$ is prime.
    D.  $b$ is not a zero divisor (which is equivalent to $b \neq 0$ in an integral domain).
    E.  Both B and D are correct in this context.
    ans: E

38. The field of fractions of the ring of integers $\mathbb{Z}$ is:
    A.  $\mathbb{Z}$ itself.
    B.  $\mathbb{R}$.
    C.  $\mathbb{Q}$.
    D.  $\mathbb{C}$.
    E.  $\mathbb{Z}[x]$.
    ans: C

39. An ideal $M$ in a ring $R$ is maximal if $M \neq R$ and:
    A.  $M$ is the largest proper ideal.
    B.  $M$ is principal.
    C.  There is no ideal $I$ such that $M \subsetneq I \subsetneq R$.
    D.  $R/M$ is an integral domain.
    E.  $M = (p)$ for some prime element $p$.
    ans: C

40. An ideal $M$ of a ring $R$ is maximal if and only if the quotient ring $R/M$ is:
    A.  The zero ring.
    B.  An integral domain.
    C.  A field.
    D.  A principal ideal domain.
    E.  Isomorphic to $R$.
    ans: C

41. The maximal ideals of $\mathbb{Z}$ are the principal ideals $(p)$ where:
    A.  $p$ is any integer.
    B.  $p$ is a unit ($\pm 1$).
    C.  $p$ is a prime number.
    D.  $p$ is an irreducible integer (same as prime in Z).
    E.  Both C and D are correct.
    ans: E

42. The maximal ideals of the polynomial ring $\mathbb{C}[x]$ are the principal ideals $(x-a)$ where:
    A.  $a \in \mathbb{Z}$.
    B.  $a \in \mathbb{Q}$.
    C.  $a \in \mathbb{R}$.
    D.  $a \in \mathbb{C}$.
    E.  $a=0$.
    ans: D

43. Hilbert's Nullstellensatz establishes a correspondence between maximal ideals in $\mathbb{C}[x_1, \dots, x_n]$ and:
    A.  Prime ideals in $\mathbb{Z}$.
    B.  Points in $\mathbb{C}^n$.
    C.  Algebraic varieties in $\mathbb{C}^n$.
    D.  Irreducible polynomials in $\mathbb{C}[x_1, \dots, x_n]$.
    E.  Subrings of $\mathbb{C}$.
    ans: B

44. An algebraic variety in $\mathbb{C}^n$ is defined as:
    A.  The image of a polynomial map $\mathbb{C}^m \to \mathbb{C}^n$.
    B.  A subset that is open in the Euclidean topology.
    C.  The set of common zeros of a finite number of polynomials in $\mathbb{C}[x_1, \dots, x_n]$.
    D.  A maximal ideal in $\mathbb{C}[x_1, \dots, x_n]$.
    E.  A subfield of $\mathbb{C}$.
    ans: C

45. If a system of polynomial equations $f_1 = \dots = f_r = 0$ has no solution in $\mathbb{C}^n$, then the ideal $I = (f_1, \dots, f_r)$ in $\mathbb{C}[x_1, \dots, x_n]$ must be:
    A.  The zero ideal.
    B.  A maximal ideal.
    C.  A prime ideal.
    D.  The unit ideal (the whole ring).
    E.  Principal.
    ans: D

46. Classical Nullstellensatz: If polynomial $g$ vanishes on the variety $V$ defined by ideal $I=(f_1, \dots, f_r)$, then:
    A.  $g \in I$.
    B.  $g$ must be the zero polynomial.
    C.  $g^k \in I$ for some integer $k \ge 1$.
    D.  $I$ must be the ideal $(g)$.
    E.  $V$ must be empty.
    ans: C

47. An element $e$ in a ring $R$ is idempotent if $e^2=e$. If $e$ is idempotent, which element is also guaranteed to be idempotent?
    A.  $2e$
    B.  $e^{-1}$ (if it exists)
    C.  $re$ for any $r \in R$
    D.  $1-e$
    E.  $-e$
    ans: D

### Chapter 11: Factorization

1.  The division with remainder property for integers states that if $a, b \in \mathbb{Z}$ and $a \neq 0$, there exist integers $q, r$ such that $b = aq + r$ and:
    A.  $0 \le r < a$
    B.  $0 \le r \le |a|$
    C.  $0 < r < |a|$
    D.  $0 \le r < |a|$
    E.  $r$ divides $a$
    ans: D

2.  If integers $a$ and $b$ have no common factor other than $\pm 1$, then there exist integers $r, s$ such that:
    A.  $a = rb + s$
    B.  $ab = rs$
    C.  $r a + s b = 1$
    D.  $a^r b^s = 1$
    E.  $gcd(r,s) = 1$
    ans: C

3.  The Fundamental Theorem of Arithmetic states that every integer $a \neq 0$ can be written as $a = c p_1 \dots p_k$, where $p_i$ are positive prime integers, $c = \pm 1$, and this expression is:
    A.  Unique.
    B.  Unique except for the value of $c$.
    C.  Unique except for the ordering of the prime factors $p_i$.
    D.  Not necessarily unique.
    E.  Unique only if $a > 0$.
    ans: C

4.  A polynomial $p(x)$ with coefficients in a field $F$ is called irreducible if it is not constant and:
    A.  It has no roots in $F$.
    B.  Its only divisors in $F[x]$ are constants and constant multiples of $p(x)$.
    C.  It is monic.
    D.  Its degree is a prime number.
    E.  It can be factored into linear terms.
    ans: B

5.  Theorem (1.5b) states that if $p(x) \in F[x]$ is an irreducible polynomial over a field $F$ and $p$ divides a product $fg$ in $F[x]$, then:
    A.  $p$ must divide both $f$ and $g$.
    B.  $p$ must divide $f$ or $g$.
    C.  $deg(p)$ must divide $deg(f)$ or $deg(g)$.
    D.  $f$ and $g$ must be constant multiples of $p$.
    E.  $fg$ must be 0.
    ans: B

6.  Over the field of complex numbers $\mathbb{C}$, the irreducible polynomials are:
    A.  Only quadratic polynomials with no real roots.
    B.  All linear polynomials $c(x-\alpha)$.
    C.  Only constant polynomials.
    D.  Polynomials of prime degree.
    E.  Polynomials with integer coefficients.
    ans: B

7.  Over the field of real numbers $\mathbb{R}$, the irreducible polynomials are:
    A.  Only linear polynomials.
    B.  Only quadratic polynomials with negative discriminant.
    C.  Linear polynomials and quadratic polynomials with negative discriminant.
    D.  Polynomials with rational coefficients.
    E.  Only cubic polynomials.
    ans: C

8.  A polynomial $f(x)$ of degree $n$ with coefficients in a field $F$ has at most how many roots in $F$?
    A.  1
    B.  $n/2$
    C.  $n$
    D.  $n+1$
    E.  Infinitely many if $F$ is infinite.
    ans: C

9.  In an integral domain $R$, two elements $a, a'$ are called associates if:
    A.  $a+a'=0$
    B.  $a$ divides $a'$ and $a'$ divides $a$.
    C.  $a a' = 1$
    D.  $a$ and $a'$ generate the same maximal ideal.
    E.  $a = u a'$ for some unit $u$.
    ans: E

10. In an integral domain $R$, an element $u$ is a unit if and only if the principal ideal $(u)$ is equal to:
    A.  $(0)$
    B.  $(1)$ or $R$
    C.  A maximal ideal
    D.  A prime ideal
    E.  The intersection of all ideals
    ans: B

11. The condition that the process of factoring a non-zero, non-unit element $a$ terminates after finitely many steps is equivalent to which condition on principal ideals?
    A.  $R$ contains no infinite descending chain of principal ideals.
    B.  $R$ contains no infinite increasing chain of principal ideals (Ascending Chain Condition).
    C.  Every principal ideal is maximal.
    D.  $R$ is a field.
    E.  Every element is irreducible.
    ans: B

12. An integral domain $R$ is called a Unique Factorization Domain (UFD) if existence of factorizations holds, and:
    A.  Every irreducible element is prime.
    B.  Every element is irreducible.
    C.  The factorization into irreducibles is unique up to ordering and associates.
    D.  Every ideal is principal.
    E.  $R$ is a Euclidean domain.
    ans: C

13. In the ring $\mathbb{Z}[\sqrt{-5}]$, the element 2 is:
    A.  Prime but not irreducible.
    B.  A unit.
    C.  Irreducible but not prime.
    D.  Both prime and irreducible.
    E.  Neither prime nor irreducible.
    ans: C

14. In an integral domain where existence of factorizations holds, $R$ is a UFD if and only if:
    A.  Every prime element is irreducible.
    B.  Every irreducible element is prime.
    C.  $R$ is a PID.
    D.  $R$ has finitely many units.
    E.  $R$ is a field.
    ans: B

15. An integral domain in which every ideal is principal is called a:
    A.  Unique Factorization Domain (UFD)
    B.  Field
    C.  Euclidean Domain
    D.  Principal Ideal Domain (PID)
    E.  Integral Extension
    ans: D

16. In a Principal Ideal Domain (PID), the relationship between irreducible and prime elements is:
    A.  An element is irreducible if and only if it is prime.
    B.  Prime elements are always irreducible, but not conversely.
    C.  Irreducible elements are always prime, but not conversely.
    D.  Neither implies the other.
    E.  Only units can be prime.
    ans: A

17. Which statement correctly describes the relationship between PIDs and UFDs?
    A.  Every UFD is a PID.
    B.  Every PID is a UFD.
    C.  A ring is a PID if and only if it is a UFD.
    D.  The concepts are independent.
    E.  No PID is a UFD.
    ans: B

18. In a PID $R$, a nonzero element $p$ generates a maximal ideal $(p)$ if and only if:
    A.  $p$ is a unit.
    B.  $p$ is irreducible.
    C.  $R/(p)$ is an integral domain.
    D.  $p$ is prime.
    E.  Both B and D are correct and equivalent in a PID.
    ans: E

19. An integral domain $R$ is a Euclidean Domain if there exists a size function $\sigma: R - \{0\} \to \{0, 1, 2, \dots\}$ such that for any $a, b \in R$ with $a \neq 0$, there exist $q, r \in R$ with $b = aq + r$ and either:
    A.  $r=0$ or $\sigma(r) > \sigma(a)$
    B.  $r=0$ or $\sigma(r) \le \sigma(a)$
    C.  $r=0$ or $\sigma(r) < \sigma(a)$
    D.  $r \neq 0$ and $\sigma(r) = \sigma(a)$
    E.  $q=0$ or $\sigma(q) < \sigma(b)$
    ans: C

20. Which of the following is NOT a Euclidean domain?
    A.  $\mathbb{Z}$ (Integers)
    B.  $F[x]$ (Polynomials over a field F)
    C.  $\mathbb{Z}[i]$ (Gauss integers)
    D.  $\mathbb{Z}[\sqrt{-5}]$
    E.  All of the above are Euclidean domains.
    ans: D

21. The relationship between Euclidean Domains (ED) and Principal Ideal Domains (PID) is:
    A.  Every PID is an ED.
    B.  Every ED is a PID.
    C.  ED and PID are equivalent concepts.
    D.  The concepts are independent.
    E.  No ED is a PID.
    ans: B

22. A polynomial $f(x) \in \mathbb{Z}[x]$ is called primitive if its coefficients have no common integer factor other than $\pm 1$ and:
    A.  Its constant term is 1.
    B.  It is monic.
    C.  Its degree is prime.
    D.  Its leading coefficient is positive.
    E.  It is irreducible in $\mathbb{Q}[x]$.
    ans: D

23. Gauss's Lemma (Theorem 3.3) states that a product of primitive polynomials in $\mathbb{Z}[x]$ is:
    A.  Always reducible.
    B.  Primitive.
    C.  Monic.
    D.  Equal to 1.
    E.  Has content greater than 1.
    ans: B

24. If a non-constant polynomial $f \in \mathbb{Z}[x]$ is irreducible in $\mathbb{Z}[x]$, what can be said about its irreducibility in $\mathbb{Q}[x]$?
    A.  It is irreducible in $\mathbb{Q}[x]$.
    B.  It is reducible in $\mathbb{Q}[x]$.
    C.  It depends on the degree of $f$.
    D.  It is irreducible in $\mathbb{Q}[x]$ only if $f$ is primitive.
    E.  It is reducible in $\mathbb{Q}[x]$ only if $f$ is not primitive.
    ans: A

25. The polynomial ring $\mathbb{Z}[x]$ is an example of a ring that is:
    A.  A PID but not a UFD.
    B.  A Euclidean Domain.
    C.  A UFD but not a PID.
    D.  A field.
    E.  Not an integral domain.
    ans: C

26. Let $f(x) = a_n x^n + \dots + a_0 \in \mathbb{Z}[x]$. The Eisenstein Criterion states that if there is a prime integer $p$ such that $p \nmid a_n$, $p | a_i$ for $i=0, \dots, n-1$, and $p^2 \nmid a_0$, then $f(x)$ is:
    A.  Reducible in $\mathbb{Z}[x]$.
    B.  Always primitive.
    C.  Irreducible in $\mathbb{Q}[x]$.
    D.  Has $n$ distinct roots modulo $p$.
    E.  Divisible by $p$.
    ans: C

27. The cyclotomic polynomial $\Phi_p(x) = x^{p-1} + x^{p-2} + \dots + x + 1$ for a prime $p$ is:
    A.  Reducible in $\mathbb{Q}[x]$ for all primes $p$.
    B.  Irreducible in $\mathbb{Q}[x]$ for all primes $p$.
    C.  Irreducible only if $p=2$.
    D.  Has roots modulo $p$.
    E.  Is primitive only if $p=2$.
    ans: B

28. Which integer prime is NOT a Gauss prime (i.e., is reducible in $\mathbb{Z}[i]$)?
    A.  3
    B.  7
    C.  11
    D.  5
    E.  19
    ans: D

29. According to Theorem (5.1), a prime integer $p$ is a sum of two integer squares ($p = a^2 + b^2$) if and only if:
    A.  $p = 2$ or $p \equiv 1 \pmod 4$.
    B.  $p \equiv 3 \pmod 4$.
    C.  $p$ is a Gauss prime.
    D.  $p$ is odd.
    E.  $p \equiv 1 \pmod 3$.
    ans: A

30. An algebraic number $\alpha$ is an algebraic integer if:
    A.  $\alpha \in \mathbb{Z}$.
    B.  $\alpha$ is a root of a polynomial with integer coefficients.
    C.  $\alpha$ is a root of a monic polynomial with integer coefficients.
    D.  $\alpha$ is a root of a primitive polynomial in $\mathbb{Z}[x]$.
    E.  $\alpha \in \mathbb{Q}$.
    ans: C

31. Let $R$ be the ring of integers in an imaginary quadratic field $\mathbb{Q}(\sqrt{d})$ with $d < 0$. An element $\alpha \in R$ is a unit if and only if its norm $N(\alpha) = \alpha \bar{\alpha}$ is:
    A.  0
    B.  1
    C.  A prime integer.
    D.  A square integer.
    E.  Negative.
    ans: B

32. For which value of $d$ is the ring of integers $R$ in $\mathbb{Q}(\sqrt{d})$ NOT a UFD?
    A.  $d = -1$ (Gauss integers)
    B.  $d = -2$
    C.  $d = -3$
    D.  $d = -5$
    E.  $d = -7$
    ans: D

33. In the ring of integers $R$ of an imaginary quadratic field, let $A$ and $B$ be nonzero ideals. The product ideal $AB$ is defined as:
    A.  $\{\alpha \beta \mid \alpha \in A, \beta \in B\}$
    B.  The set of all finite sums $\sum \alpha_i \beta_i$ where $\alpha_i \in A, \beta_i \in B$.
    C.  $A \cap B$
    D.  $A \cup B$
    E.  The ideal generated by $N(A)N(B)$.
    ans: B

34. An ideal $P$ in a commutative ring $R$ (with $P \neq R$) is a prime ideal if for any $a, b \in R$:
    A.  $a+b \in P \implies a \in P$ and $b \in P$.
    B.  $ab \in P \implies a \in P$ or $b \in P$.
    C.  $a \in P \implies a^{-1} \in P$.
    D.  $P$ is generated by a prime element.
    E.  $R/P$ is a field.
    ans: B

35. In the ring of integers $R$ of an imaginary quadratic field, the nonzero prime ideals are precisely the:
    A.  Principal ideals $(p)$ where $p$ is a prime element.
    B.  Ideals $A$ such that $N(A)$ is prime.
    C.  Maximal ideals.
    D.  Ideals $A$ such that $A = \bar{A}$.
    E.  Ideals with exactly two generators.
    ans: C

36. The Unique Factorization Theorem for Ideals (Theorem 8.9) in the ring of integers $R$ of an imaginary quadratic field states that every nonzero proper ideal:
    A.  Is principal.
    B.  Is a product of prime elements.
    C.  Is a product of prime ideals, uniquely up to order.
    D.  Is generated by a prime integer.
    E.  Has a prime norm.
    ans: C

37. The Main Lemma (8.10) for ideals in the ring of integers $R$ of an imaginary quadratic field states that for any nonzero ideal $A$:
    A.  $A$ is principal.
    B.  $A \bar{A}$ is the zero ideal.
    C.  $A \bar{A}$ is the unit ideal $R$.
    D.  $A \bar{A}$ is a principal ideal $(n)$ for some integer $n$.
    E.  $A = \bar{A}$.
    ans: D

38. The Cancellation Law for ideals (Prop 8.11a) in the ring of integers $R$ of an imaginary quadratic field states that if $A, B, C$ are nonzero ideals and $AB = AC$, then:
    A.  $A=R$
    B.  $B = C$
    C.  $A$ must be principal.
    D.  $B$ and $C$ are conjugate.
    E.  $A=(0)$.
    ans: B

39. In the ring of integers $R$ of an imaginary quadratic field, the relationship between ideal containment and division is:
    A.  $A \supset B$ implies $A$ divides $B$.
    B.  $A$ divides $B$ implies $A \supset B$.
    C.  $A \supset B$ if and only if $A$ divides $B$.
    D.  Containment and division are unrelated.
    E.  $A$ divides $B$ iff $B$ divides $A$.
    ans: C

40. The ring of integers $R$ of an imaginary quadratic field is a UFD if and only if:
    A.  It contains $\mathbb{Z}[i]$.
    B.  Its discriminant is prime.
    C.  It is a PID.
    D.  It has only finitely many units.
    E.  $d \equiv 1 \pmod 4$.
    ans: C

41. Two ideals $A, B$ in the ring of integers $R$ of an imaginary quadratic field are called similar ($A \sim B$) if:
    A.  $A + B = R$
    B.  $A \cap B = (0)$
    C.  $\sigma B = \tau A$ for some nonzero $\sigma, \tau \in R$.
    D.  $A$ and $B$ have the same norm.
    E.  $A = \bar{B}$.
    ans: C

42. The ideal classes of the ring of integers $R$ of an imaginary quadratic field form:
    A.  A field.
    B.  A finite abelian group under ideal multiplication.
    C.  An infinite cyclic group.
    D.  A ring isomorphic to $R$.
    E.  A set with no algebraic structure.
    ans: B

43. The identity element in the ideal class group corresponds to the class of:
    A.  The zero ideal.
    B.  Prime ideals.
    C.  Maximal ideals.
    D.  Principal ideals.
    E.  Non-principal ideals.
    ans: D

44. Minkowski's Lemma (10.9) is used to prove that:
    A.  Every ideal is principal.
    B.  The ideal class group is finite.
    C.  $R$ is a Euclidean Domain.
    D.  Ideals factor uniquely.
    E.  There are infinitely many units in the real quadratic case.
    ans: B

45. The norm of an ideal $A$, denoted $N(A)$, satisfies $N(A) = [R:A]$ and relates to the Main Lemma $A\bar{A}=(n)$ by:
    A.  $N(A) = n^2$
    B.  $N(A) = |n|$
    C.  $N(A) = \sqrt{n}$
    D.  $N(A) = [A:R]$
    E.  $N(A) = N(\bar{A})$
    ans: B

46. In the ring of integers $R$ of a real quadratic field $\mathbb{Q}(\sqrt{d})$ with $d > 0$, the group of units is:
    A.  Always $\{\pm 1\}$.
    B.  Finite and cyclic.
    C.  Infinite.
    D.  Trivial.
    E.  The same as in the imaginary case with $-d$.
    ans: C

47. The equation $x^2+y^2=n$ has an integer solution if and only if the prime factorization of $n$ has which property?
    A.  All prime factors are $\equiv 1 \pmod 4$.
    B.  No prime factor is $\equiv 3 \pmod 4$.
    C.  All prime factors $p \equiv 3 \pmod 4$ appear with an even exponent.
    D.  $n$ is not divisible by any prime $p \equiv 3 \pmod 4$.
    E.  $n$ is a perfect square.
    ans: C

### Chapter 12: Modules

1.  An $R$-module $V$, where $R$ is a commutative ring, is defined as an abelian group $V$ under addition, plus a scalar multiplication $R \times V \to V$, $(r,v) \mapsto rv$, satisfying several axioms. Which of the following is NOT one of these axioms?
    A.  $1v = v$
    B.  $(rs)v = r(sv)$
    C.  $(r + s)v = rv + sv$
    D.  $r(v + v') = rv + rv'$
    E.  If $rv = 0$, then $r=0$ or $v=0$.
    ans: E

2.  When $F$ is a field, an $F$-module is precisely the same as:
    A.  An $F$-ring
    B.  An $F$-vector space
    C.  A field extension of $F$
    D.  An abelian group
    E.  A principal ideal domain over F
    ans: B

3.  The concept of a $\mathbb{Z}$-module is equivalent to the concept of:
    A.  A ring
    B.  A field
    C.  An abelian group
    D.  A free group
    E.  A vector space over $\mathbb{Q}$
    ans: C

4.  A submodule of an $R$-module $V$ is a nonempty subset $W$ that is closed under:
    A.  Addition only
    B.  Scalar multiplication only
    C.  Both addition and scalar multiplication
    D.  Containing the zero vector $0_V$
    E.  The inverse operation of addition
    ans: C

5.  The submodules of the $R$-module $R^1$ (i.e., $R$ itself) are precisely the:
    A.  Units of R
    B.  Ideals of R
    C.  Subrings of R
    D.  Zero divisors of R
    E.  Elements of R
    ans: B

6.  A homomorphism $\phi: V \to W$ of $R$-modules must satisfy $\phi(v+v') = \phi(v) + \phi(v')$ and:
    A.  $\phi(rv) = r + \phi(v)$
    B.  $\phi(rv) = \phi(r)\phi(v)$
    C.  $\phi(rv) = r \phi(v)$
    D.  $\phi(r+v) = r + \phi(v)$
    E.  $\phi(v) = v$
    ans: C

7.  The kernel of an $R$-module homomorphism $\phi: V \to W$ is:
    A.  A submodule of W
    B.  A submodule of V
    C.  An ideal of R
    D.  The image of $\phi$
    E.  Necessarily the zero module $\{0_V\}$
    ans: B

8.  If $W$ is a submodule of an $R$-module $V$, the quotient $V/W$ is made into an $R$-module by defining the scalar multiplication as $r\bar{v} =$:
    A.  $\overline{rv}$
    B.  $\overline{r} \overline{v}$
    C.  $\overline{v}$
    D.  $r + \bar{v}$
    E.  $\overline{0}$
    ans: A

9.  The First Isomorphism Theorem for modules states that if $\phi: V \to W$ is a homomorphism with $\ker \phi = K$, then:
    A.  $V/K \approx W$
    B.  $V/K \approx \text{im } \phi$
    C.  $W/K \approx V$
    D.  $V \approx K \times W$
    E.  $K \approx \text{im } \phi$
    ans: B

10. An $n \times n$ matrix $A$ with entries in a commutative ring $R$ is invertible (i.e., $A \in GL_n(R)$) if and only if:
    A.  $\det A = 1$
    B.  $\det A = \pm 1$
    C.  $\det A$ is a unit in $R$.
    D.  $\det A \neq 0$.
    E.  $A$ has no zero entries.
    ans: C

11. For the ring $R = \mathbb{Z}$, the group $GL_n(\mathbb{Z})$ consists of $n \times n$ integer matrices $A$ such that:
    A.  All entries are $\pm 1$.
    B.  $\det A = 1$.
    C.  $\det A = \pm 1$.
    D.  $A$ is elementary.
    E.  $A$ is diagonal.
    ans: C

12. An ordered set $(v_1, \dots, v_k)$ of elements in an $R$-module $V$ is said to generate $V$ if:
    A.  The set is linearly independent.
    B.  Every element $v \in V$ is a unique linear combination of $v_1, \dots, v_k$.
    C.  Every element $v \in V$ is some $v_i$.
    D.  Every element $v \in V$ can be written as $r_1v_1 + \dots + r_kv_k$ for some $r_i \in R$.
    E.  $k$ is the dimension of $V$.
    ans: D

13. An $R$-module $V$ is called a free module if:
    A.  It has no relations.
    B.  It is isomorphic to $R^k$ for some $k$.
    C.  Every element is a generator.
    D.  It is a $\mathbb{Z}$-module.
    E.  It has a finite number of elements.
    ans: B

14. A set of elements $(v_1, \dots, v_n)$ in an $R$-module $V$ is a basis if:
    A.  It generates $V$.
    B.  It is linearly independent.
    C.  It generates $V$ and is linearly independent.
    D.  Every element $v \in V$ is a unique linear combination of the $v_i$.
    E.  Both C and D are equivalent definitions.
    ans: E

15. An $R$-module $V$ has a basis if and only if it is:
    A.  Finitely generated
    B.  Free
    C.  A $\mathbb{Z}$-module
    D.  Non-zero
    E.  Cyclic
    ans: B

16. The number of elements in a basis for a free module $V$ over a commutative ring $R \neq \{0\}$ is called the:
    A.  Dimension of V
    B.  Order of V
    C.  Rank of V
    D.  Characteristic of V
    E.  Degree of V
    ans: C

17. The Principle of Permanence of Identities allows us to extend identities proven for matrices over $\mathbb{C}$ (like $\det(AB) = (\det A)(\det B)$) to matrices over any commutative ring $R$ by:
    A.  Checking the identity for $R = \mathbb{Z}$.
    B.  Proving the identity for variable matrices in the polynomial ring $\mathbb{Z}[\{x_{ij}\}, \{y_{kl}\}]$.
    C.  Using induction on the size of the ring $R$.
    D.  Assuming $R$ is a field.
    E.  Showing the identity holds for diagonal matrices.
    ans: B

18. Theorem (4.3) states that any $m \times n$ integer matrix $A$ can be diagonalized by elementary integer row and column operations to $A' = QAP^{-1}$, where $A'$ is diagonal with entries $d_1, d_2, \dots, d_r, 0, \dots, 0$ such that:
    A.  All $d_i = 1$.
    B.  All $d_i$ are prime.
    C.  $d_1 | d_2 | d_3 | \dots | d_r$ and $d_i > 0$.
    D.  $d_1 > d_2 > \dots > d_r > 0$.
    E.  $d_i$ are the eigenvalues of $A$.
    ans: C

19. The diagonalization theorem for matrices over a Euclidean domain $R$ (like $F[t]$ or $\mathbb{Z}$) states that any $m \times n$ matrix $A$ is equivalent ($A' = QAP^{-1}$) to a diagonal matrix with diagonal entries $d_1, \dots, d_r, 0, \dots, 0$ such that:
    A.  $d_i$ are units.
    B.  $d_1 | d_2 | \dots | d_r$.
    C.  $d_i$ are irreducible elements (primes).
    D.  $d_i$ are pairwise coprime.
    E.  The determinant is $\prod d_i$.
    ans: B

20. Let $\phi: \mathbb{Z}^n \to \mathbb{Z}^m$ be multiplication by integer matrix $A$. If $A' = QAP^{-1}$ is the diagonal form with entries $d_1 | d_2 | \dots | d_r$, the kernel of $\phi$ (after change of basis) is generated by basis vectors corresponding to:
    A.  The entries $d_i \neq 0$.
    B.  The zero entries on the diagonal.
    C.  All diagonal entries.
    D.  The first diagonal entry $d_1$.
    E.  The last non-zero diagonal entry $d_r$.
    ans: B

21. Let $S$ be the subgroup of $\mathbb{Z}^m$ generated by the columns of an integer matrix $A$. Theorem (4.11) implies there is a basis $w_1, \dots, w_m$ for $\mathbb{Z}^m$ and a basis $u_1, \dots, u_n$ for $S$ (where $n \le m$) such that:
    A.  $u_j = w_j$ for $j \le n$.
    B.  $u_j = d_j w_j$ for $j \le n$, where $d_j \in \mathbb{Z}$, $d_j > 0$, and $d_1|d_2|\dots|d_n$.
    C.  $w_j = d_j u_j$ for $j \le n$, where $d_j \in \mathbb{Z}$, $d_j > 0$.
    D.  $u_j$ and $w_j$ are orthogonal.
    E.  $S = \text{span}\{w_1, \dots, w_n\}$.
    ans: B

22. Corollary (4.12) states that every subgroup $S$ of a free abelian group $W$ of rank $m$ is:
    A.  Also free, of rank $n \le m$.
    B.  Cyclic.
    C.  Finite.
    D.  Trivial or equal to $W$.
    E.  Isomorphic to $\mathbb{Z}/d\mathbb{Z}$ for some $d$.
    ans: A

23. A module $V$ is presented by an $m \times n$ matrix $A$ over ring $R$ if $V$ is isomorphic to:
    A.  $R^m / \ker(A)$
    B.  $R^n / \text{im}(A)$
    C.  $\ker(A)$
    D.  $R^m / AR^n$ (cokernel of $A: R^n \to R^m$)
    E.  $AR^n$ (image of $A: R^n \to R^m$)
    ans: D

24. If $V$ is generated by $(v_1, \dots, v_m)$ and $A = [a_1, \dots, a_n]$ is a matrix whose columns form a complete set of relation vectors (i.e., $\sum_i v_i a_{ij} = 0$ for all $j$, and these generate all relations), then $A$ is called a:
    A.  Basis matrix for $V$
    B.  Transition matrix for $V$
    C.  Presentation matrix for $V$
    D.  Diagonal matrix for $V$
    E.  Jacobian matrix for $V$
    ans: C

25. Which operation on a presentation matrix $A$ does NOT necessarily preserve the isomorphism class of the presented module $V \approx R^m/AR^n$?
    A.  Replacing $A$ with $QAP^{-1}$, where $Q \in GL_m(R), P \in GL_n(R)$.
    B.  Deleting a column of zeros from $A$.
    C.  If column $j$ is $e_i$, deleting row $i$ and column $j$.
    D.  Adding a zero row to $A$.
    E.  Transposing $A$.
    ans: E

26. An $R$-module $V$ satisfies the ascending chain condition (ACC) if:
    A.  Every submodule is finitely generated.
    B.  There is no infinite strictly increasing chain of submodules $W_1 < W_2 < W_3 < \dots$.
    C.  $V$ is finitely generated.
    D.  $R$ is a field.
    E.  Both A and B are equivalent conditions.
    ans: E

27. A commutative ring $R$ is called Noetherian if:
    A.  It has no zero divisors.
    B.  Every ideal of $R$ is principal.
    C.  Every ideal of $R$ is finitely generated.
    D.  It satisfies the descending chain condition on ideals.
    E.  It is a field.
    ans: C

28. Which of the following rings is NOT Noetherian?
    A.  $\mathbb{Z}$ (integers)
    B.  $F[x]$ (polynomials in one variable over a field F)
    C.  $F[x_1, x_2, \dots]$ (polynomials in infinitely many variables)
    D.  $\mathbb{C}[x,y]$ (polynomials in two variables over complex numbers)
    E.  $\mathbb{Z}/n\mathbb{Z}$ (integers modulo n)
    ans: C

29. Hilbert Basis Theorem states that if $R$ is a Noetherian ring, then:
    A.  Every module over $R$ is free.
    B.  The polynomial ring $R[x]$ is also Noetherian.
    C.  $R$ must be a principal ideal domain (PID).
    D.  $R$ must be a field.
    E.  Every ideal in $R$ is maximal.
    ans: B

30. If $V$ is a finitely generated module over a Noetherian ring $R$, then:
    A.  $V$ must be a free module.
    B.  $V$ must be cyclic.
    C.  Every submodule of $V$ is also finitely generated.
    D.  $V$ must be isomorphic to $R$.
    E.  $V$ has finite length.
    ans: C

31. The Structure Theorem for Finitely Generated Abelian Groups states that such a group $V$ is isomorphic to a direct sum (or product) $C_{d_1} \oplus \dots \oplus C_{d_k} \oplus L$, where $C_{d_j}$ are cyclic groups of order $d_j > 1$, $L$ is a free abelian group, and:
    A.  All $d_j$ are prime powers.
    B.  $d_1 | d_2 | \dots | d_k$.
    C.  $d_1 > d_2 > \dots > d_k$.
    D.  $L$ must be the trivial group.
    E.  $k=1$.
    ans: B

32. The Structure Theorem for Finitely Generated Modules over a Euclidean Domain $R$ states that such a module $V$ is isomorphic to a direct product:
    A.  $R/(d_1) \times \dots \times R/(d_k) \times R^r$, where $d_i$ are non-units, non-zero, and $d_1 | d_2 | \dots | d_k$.
    B.  $R^m$ for some $m$.
    C.  $R/P_1 \times \dots \times R/P_k$, where $P_i$ are prime ideals.
    D.  A direct sum of simple modules.
    E.  $R/(p_1^{e_1}) \times \dots \times R/(p_k^{e_k})$, where $p_i$ are units.
    ans: A

33. How can a vector space $V$ over a field $F$ be made into an $F[t]$-module using a linear operator $T: V \to V$?
    A. Define $f(t)v = f(0)v$ for any polynomial $f(t)$.
    B. Define $tv = T(v)$ and extend polynomially: $f(t)v = [f(T)](v)$.
    C. Define $tv = v$ for all $v$.
    D. This is only possible if $T$ is the identity operator.
    E. Define $f(t)v = f(T^{-1})v$.
    ans: B

34. In the correspondence between $F[t]$-modules and linear operators $T$ on $V$, a submodule $W \subseteq V$ corresponds to:
    A.  An eigenspace of $T$.
    B.  The kernel of $T$.
    C.  A $T$-invariant subspace ($T(W) \subseteq W$).
    D.  A subspace $W$ such that $T(W) = \{0\}$.
    E.  The image of $T$.
    ans: C

35. A cyclic $F[t]$-module is isomorphic to $W = F[t]/(f(t))$ for some polynomial $f(t)$. If $f(t) = t^n + a_{n-1}t^{n-1} + \dots + a_0$, the matrix of the operator $T$ (multiplication by $t$) with respect to the basis $\{1, t, \dots, t^{n-1}\}$ (residues) is the companion matrix:
    A.  Diagonal matrix with roots of $f(t)$.
    B.  $\begin{pmatrix} 0 & 0 & \dots & -a_0 \\ 1 & 0 & \dots & -a_1 \\ \vdots & \ddots & \ddots & \vdots \\ 0 & \dots & 1 & -a_{n-1} \end{pmatrix}$
    C.  Identity matrix.
    D.  Jordan block.
    E.  Zero matrix.
    ans: B

36. The Rational Canonical Form of a linear operator $T$ over a field $F$ is a block diagonal matrix where each block is:
    A.  A Jordan block.
    B.  A diagonal matrix.
    C.  A companion matrix associated with factors of the minimal/characteristic polynomial.
    D.  An identity matrix.
    E.  A zero matrix.
    ans: C

37. Over the complex numbers $\mathbb{C}$, every irreducible polynomial is of the form $p(t) = t - \alpha$. The structure theorem for finitely generated $\mathbb{C}[t]$-modules implies decomposition into modules isomorphic to:
    A.  $\mathbb{C}[t]$
    B.  $\mathbb{C}[t]/(t^n)$
    C.  $\mathbb{C}[t]/((t-\alpha)^n)$
    D.  $\mathbb{C}$
    E.  $\mathbb{C}[t]/(t^2+1)$
    ans: C

38. A Jordan block corresponding to eigenvalue $\alpha$ and size $n$ is an $n \times n$ matrix with $\alpha$ on the diagonal, 1s on the subdiagonal, and 0s elsewhere. It corresponds to the matrix of $T$ (multiplication by $t$) on the module $\mathbb{C}[t]/((t-\alpha)^n)$ with respect to which basis?
    A.  $\{1, t, \dots, t^{n-1}\}$
    B.  $\{1, (t-\alpha), (t-\alpha)^2, \dots, (t-\alpha)^{n-1}\}$
    C.  Eigenvectors of $T$.
    D.  Standard basis $e_1, \dots, e_n$.
    E.  $\{1, t+\alpha, \dots, t^{n-1}+\alpha^{n-1}\}$
    ans: B

39. The Jordan Canonical Form theorem states that any linear operator $T$ on a finite-dimensional complex vector space $V$ has a basis such that the matrix of $T$ is:
    A.  Diagonal.
    B.  Unitary.
    C.  Hermitian.
    D.  Block diagonal, with each block being a Jordan block.
    E.  Block diagonal, with each block being a companion matrix.
    ans: D

40. If the characteristic polynomial of a complex matrix $A$ has distinct roots $\alpha_1, \dots, \alpha_n$, its Jordan form is:
    A.  A single Jordan block.
    B.  Diagonal with $\alpha_1, \dots, \alpha_n$ on the diagonal.
    C.  The companion matrix.
    D.  Cannot be determined without the minimal polynomial.
    E.  The identity matrix.
    ans: B

41. The Quillen-Suslin theorem characterizes finitely generated free modules $V$ over a polynomial ring $R = \mathbb{C}[x_1, \dots, x_k]$. If $A$ is a presentation matrix for $V$, then $V$ is free of rank $r$ if and only if the evaluated matrix $A(p)$ has rank $m-r$ for all $p \in \mathbb{C}^k$, where $A$ is $m \times n$. What does $m$ represent?
    A. The number of relations.
    B. The number of variables $k$.
    C. The rank of the free module $V$.
    D. The number of generators used in the presentation $V \approx R^m / AR^n$.
    E. The dimension of the base field $\mathbb{C}$.
    ans: D

42. Consider the $\mathbb{Z}$-module $V = \mathbb{Z}/(4) \times \mathbb{Z}/(6)$. According to the Structure Theorem (invariant factor form), $V$ is isomorphic to:
    A.  $\mathbb{Z}/(24)$
    B.  $\mathbb{Z}/(2) \times \mathbb{Z}/(12)$
    C.  $\mathbb{Z}/(4) \times \mathbb{Z}/(6)$ (already in this form, but need $d_1|d_2$)
    D.  $\mathbb{Z}/(2) \times \mathbb{Z}/(2) \times \mathbb{Z}/(6)$
    E.  $\mathbb{Z}/(10)$
    ans: B

43. Consider the $\mathbb{Z}$-module $V = \mathbb{Z}/(4) \times \mathbb{Z}/(6)$. According to the Structure Theorem (prime power form), $V$ is isomorphic to:
    A.  $\mathbb{Z}/(4) \times \mathbb{Z}/(2) \times \mathbb{Z}/(3)$
    B.  $\mathbb{Z}/(2) \times \mathbb{Z}/(2) \times \mathbb{Z}/(2) \times \mathbb{Z}/(3)$
    C.  $\mathbb{Z}/(8) \times \mathbb{Z}/(3)$
    D.  $\mathbb{Z}/(24)$
    E.  $\mathbb{Z}/(2) \times \mathbb{Z}/(12)$
    ans: A

44. Let $V$ be the $\mathbb{C}[t]$-module corresponding to a linear operator $T$ whose Jordan form consists of two blocks: $J_2(3)$ and $J_1(3)$. What is the dimension of the eigenspace for the eigenvalue 3?
    A. 1
    B. 2
    C. 3
    D. 4
    E. Cannot be determined.
    ans: B

45. A module is called simple if it is not the zero module and its only submodules are the zero module and itself. Any simple $R$-module (where R is commutative) is isomorphic to:
    A. R itself
    B. R / P, where P is a prime ideal.
    C. R / M, where M is a maximal ideal.
    D. A free module of rank 1.
    E. The zero module.
    ans: C

### Chapter 13: Fields

1.  A field $K$ which contains another field $F$ as a subfield is called:
    A.  A prime field of F
    B.  An extension field of F
    C.  A simple field over F
    D.  An algebraic closure of F
    E.  A characteristic field of F
    ans: B

2.  Which of the following is NOT one of the three most important classes of fields mentioned in Section 1?
    A.  Number fields
    B.  Finite fields
    C.  Function fields
    D.  Quaternion fields
    E.  All listed are mentioned as important classes.
    ans: D

3.  Every number field is an extension of which base field?
    A.  $\mathbb{R}$ (Real numbers)
    B.  $\mathbb{C}$ (Complex numbers)
    C.  $\mathbb{Q}$ (Rational numbers)
    D.  $\mathbb{Z}$ (Integers)
    E.  $\mathbb{F}_p$ (Prime field)
    ans: C

4.  A finite field $K$ contains a subfield isomorphic to $\mathbb{F}_p$ for some prime $p$. This prime $p$ is the:
    A.  Order of the field $K$
    B.  Number of elements in $K$ minus 1
    C.  Characteristic of the field $K$
    D.  Degree of the extension $K/\mathbb{F}_p$
    E.  Largest prime factor of $|K|$
    ans: C

5.  Function fields, as described in (1.3), are often extensions of which field?
    A.  $\mathbb{Q}(x)$
    B.  $\mathbb{R}(x)$
    C.  $\mathbb{C}(x)$
    D.  $\mathbb{F}_p(x)$
    E.  $\mathbb{Q}$
    ans: C

6.  An element $\alpha$ in an extension field $K$ of $F$ is called algebraic over $F$ if:
    A.  $\alpha \in F$
    B.  $\alpha$ is a root of some non-zero polynomial $f(x) \in F[x]$
    C.  $F(\alpha) = F$
    D.  $\alpha$ can be constructed using ruler and compass starting from $F$.
    E.  $\alpha$ is not transcendental over $F$.
    ans: B

7.  An element $\alpha$ in an extension field $K$ of $F$ is called transcendental over $F$ if:
    A.  $\alpha$ is algebraic over $F$.
    B.  $\alpha$ is not a root of any non-zero polynomial $f(x) \in F[x]$.
    C.  $F(\alpha)$ is a finite extension of $F$.
    D.  $\alpha$ belongs to the algebraic closure of $F$.
    E.  The degree $[F(\alpha):F]$ is prime.
    ans: B

8.  The property of an element being algebraic or transcendental depends on the base field $F$. The complex number $2\pi i$ is:
    A.  Algebraic over $\mathbb{C}$, algebraic over $\mathbb{R}$, algebraic over $\mathbb{Q}$.
    B.  Transcendental over $\mathbb{C}$, transcendental over $\mathbb{R}$, transcendental over $\mathbb{Q}$.
    C.  Algebraic over $\mathbb{C}$, algebraic over $\mathbb{R}$, transcendental over $\mathbb{Q}$.
    D.  Algebraic over $\mathbb{C}$, transcendental over $\mathbb{R}$, transcendental over $\mathbb{Q}$.
    E.  Transcendental over $\mathbb{C}$, algebraic over $\mathbb{R}$, transcendental over $\mathbb{Q}$.
    ans: C

9.  If $\alpha$ is algebraic over $F$, the monic polynomial of lowest degree in $F[x]$ having $\alpha$ as a root is called the:
    A.  Characteristic polynomial of $\alpha$ over $F$.
    B.  Minimal polynomial of $\alpha$ over $F$.
    C.  Irreducible polynomial for $\alpha$ over $F$.
    D.  Cyclotomic polynomial for $\alpha$ over $F$.
    E.  Both B and C are commonly used terms.
    ans: E

10. If $\alpha$ is transcendental over $F$, the field extension $F(\alpha)$ is isomorphic to:
    A.  $F$ itself.
    B.  $F[x]$, the polynomial ring.
    C.  $F(x)$, the field of rational functions in $x$.
    D.  The algebraic closure of $F$.
    E.  A finite field extension of $F$.
    ans: C

11. If $\alpha$ is algebraic over $F$ with irreducible polynomial $f(x)$ of degree $n$, then $F[\alpha]$ (the ring generated by $\alpha$ over $F$) is:
    A.  Isomorphic to $F[x]$.
    B.  Isomorphic to $F[x]/(f(x))$ and is a field.
    C.  A proper subring of $F(\alpha)$.
    D.  An infinite dimensional vector space over $F$.
    E.  Isomorphic to $F(x)$.
    ans: B

12. Two elements $\alpha, \beta$ (algebraic over $F$) generate $F$-isomorphic field extensions $F(\alpha) \cong F(\beta)$ (with $\alpha \mapsto \beta$) if and only if:
    A.  $F(\alpha)$ and $F(\beta)$ have the same degree over $F$.
    B.  $\alpha$ and $\beta$ have the same irreducible polynomial over $F$.
    C.  $\alpha$ and $\beta$ are roots of the same polynomial in $F[x]$.
    D.  $\alpha = c\beta$ for some $c \in F$.
    E.  $\beta \in F(\alpha)$.
    ans: B

13. The degree of a field extension $K$ over $F$, denoted $[K:F]$, is defined as:
    A.  The number of elements in $K$ divided by the number of elements in $F$.
    B.  The dimension of $K$ as a vector space over $F$.
    C.  The number of generators required to obtain $K$ from $F$.
    D.  The degree of the minimal polynomial of any element $\alpha \in K \setminus F$.
    E.  The number of subfields between $F$ and $K$.
    ans: B

14. If $\alpha$ is algebraic over $F$, then $[F(\alpha):F]$ is equal to:
    A.  The number of roots of the irreducible polynomial for $\alpha$.
    B.  The degree of the irreducible polynomial for $\alpha$ over $F$.
    C.  Infinity.
    D.  1.
    E.  The characteristic of $F$.
    ans: B

15. If $F \subset K \subset L$ is a tower of fields, the relationship between the degrees of the extensions is:
    A.  $[L:F] = [L:K] + [K:F]$
    B.  $[L:F] = [L:K] / [K:F]$
    C.  $[L:F] = [L:K] [K:F]$
    D.  $[L:F] = \max([L:K], [K:F])$
    E.  $[L:F]^2 = [L:K]^2 + [K:F]^2$
    ans: C

16. If $K$ is a finite extension of $F$ with degree $[K:F]=n$, and $\alpha \in K$, then the degree of $\alpha$ over $F$:
    A.  Must be equal to $n$.
    B.  Must divide $n$.
    C.  Must be a multiple of $n$.
    D.  Is unrelated to $n$.
    E.  Must be less than $n$.
    ans: B

17. If $[K:F] = p$, where $p$ is prime, and $\alpha \in K$ but $\alpha \notin F$, then:
    A.  $K=F(\alpha)$ and the degree of $\alpha$ over $F$ is $p$.
    B.  $F(\alpha)$ is a proper subfield of $K$.
    C.  The degree of $\alpha$ over $F$ must be 1.
    D.  $K$ must have characteristic $p$.
    E.  $\alpha^p \in F$.
    ans: A

18. Corollary (3.8) states that every irreducible polynomial in $\mathbb{R}[x]$ has degree:
    A.  Only 1.
    B.  Only 2.
    C.  1 or 2.
    D.  Any prime number.
    E.  Any power of 2.
    ans: C

19. Let $K$ be an extension of $F$. The set of elements in $K$ that are algebraic over $F$ forms:
    A.  A ring, but not necessarily a field.
    B.  A vector space over $F$, but not necessarily a ring.
    C.  A subfield of $K$.
    D.  The whole set $K$.
    E.  Only the set $F$ itself.
    ans: C

20. A field extension $K$ of $F$ is called an algebraic extension if:
    A.  $[K:F]$ is finite.
    B.  Every element of $K$ is algebraic over $F$.
    C.  $K = F(\alpha)$ for some algebraic element $\alpha$.
    D.  $K$ is a number field.
    E.  $K$ has characteristic 0.
    ans: B

21. If $L$ is algebraic over $K$ and $K$ is algebraic over $F$, then:
    A.  $L$ might be transcendental over $F$.
    B.  $L$ is algebraic over $F$.
    C.  $[L:F]$ must be prime.
    D.  $L=K=F$.
    E.  $F$ must be algebraically closed.
    ans: B

22. A real number $a$ is constructible (using ruler and compass, starting from points (0,0) and (1,0)) if its absolute value $|a|$ is:
    A.  Rational.
    B.  An integer.
    C.  The distance between two constructible points.
    D.  A root of a quadratic equation.
    E.  Transcendental.
    ans: C

23. The set of constructible real numbers forms a:
    A.  Ring, but not a field.
    B.  Field, but not closed under square roots.
    C.  Subfield of $\mathbb{R}$ closed under taking square roots of positive elements.
    D.  Finite set.
    E.  Countably infinite set isomorphic to $\mathbb{Q}$.
    ans: C

24. If a real number $\alpha$ is constructible, then its degree over $\mathbb{Q}$:
    A.  Must be 1 or 2.
    B.  Must be prime.
    C.  Must be a power of 2.
    D.  Can be any integer.
    E.  Must be infinite (i.e., $\alpha$ is transcendental).
    ans: C

25. The angle $60^\circ$ cannot be trisected using ruler and compass because:
    A.  $60$ is not a power of 2.
    B.  Trisecting requires solving cubic equations in general.
    C.  $\cos(20^\circ)$ has degree 3 over $\mathbb{Q}$.
    D.  $20^\circ$ is an irrational angle.
    E.  $\cos(60^\circ) = 1/2$ is not an integer.
    ans: C

26. The regular $n$-gon can be constructed using ruler and compass only if $\phi(n)$ (Euler's totient function) is:
    A.  A prime number.
    B.  An odd number.
    C.  Equal to $n-1$.
    D.  A power of 2.
    E.  Divisible by 3.
    ans: D (This follows from Galois theory, but Corollary 4.14 implies that if the p-gon is constructible, p must be a Fermat prime, $p=2^r+1$. The general condition involves $\phi(n)$ being a power of 2.)

27. A regular $p$-gon (where $p$ is prime) can be constructed if and only if $p$ is of the form:
    A.  $2^k$ for some integer $k$.
    B.  $2^k + 1$ for some integer $k$.
    C.  $3k+1$ for some integer $k$.
    D.  $4k+1$ for some integer $k$.
    E.  $p=3$.
    ans: B

28. Given a field $F$ and an irreducible polynomial $f(x) \in F[x]$, the quotient ring $K = F[x]/(f(x))$ is:
    A.  Always the zero ring.
    B.  An integral domain, but not necessarily a field.
    C.  A field extension of $F$.
    D.  Isomorphic to $F[x]$.
    E.  A ring with zero divisors if $\deg(f) > 1$.
    ans: C

29. Let $f(x) \in F[x]$. There exists a field extension $K$ of $F$ in which $f(x)$ has a root. This is achieved by:
    A.  Taking $K=F$.
    B.  Taking $K=F[x]/(g(x))$ where $g(x)$ is any irreducible factor of $f(x)$.
    C.  Taking $K$ to be the field of fractions of $F[x]$.
    D.  Taking $K$ to be the algebraic closure of $F$.
    E.  This is only possible if $F$ is algebraically closed.
    ans: B

30. Let $K$ be an extension field of $F$, and $f(x), g(x) \in F[x]$. Which statement is FALSE?
    A.  If $f$ divides $g$ in $F[x]$, then $f$ divides $g$ in $K[x]$.
    B.  If $f$ divides $g$ in $K[x]$, then $f$ divides $g$ in $F[x]$.
    C.  The monic gcd of $f$ and $g$ is the same in $F[x]$ and $K[x]$.
    D.  $f$ and $g$ have a common root in $K$ iff their gcd in $F[x]$ has degree > 0.
    E.  If $f$ is irreducible in $F[x]$ and has a root in $K$, it divides any $g \in F[x]$ that also has that root.
    ans: B

31. The derivative $f'(x)$ of a polynomial $f(x) = a_n x^n + \dots + a_0$ in $F[x]$ is defined algebraically. A root $\alpha$ of $f(x)$ (in some extension field) is a multiple root if and only if:
    A.  $f(x) = (x-\alpha)^k$ for some $k \ge 2$.
    B.  $f'(\alpha) = 0$.
    C.  $\alpha \in F$.
    D.  The degree of $f(x)$ is even.
    E.  $f(x)$ is reducible over $F(\alpha)$.
    ans: B

32. An irreducible polynomial $f(x) \in F[x]$ has no multiple roots in any extension field of $F$ unless:
    A.  $F$ has characteristic 0.
    B.  $F$ is a finite field.
    C.  The derivative $f'(x)$ is the zero polynomial.
    D.  $f(x)$ is linear.
    E.  $f(x)$ has degree 2.
    ans: C

33. The derivative $f'(x)$ of a non-constant polynomial $f(x)$ is the zero polynomial if and only if $F$ has prime characteristic $p$ and:
    A.  $f(x) = c$ for some constant $c$.
    B.  $f(x)$ has $p$ roots.
    C.  $f(x) = g(x^p)$ for some polynomial $g(y) \in F[y]$.
    D.  $f(x)$ is irreducible.
    E.  The degree of $f(x)$ is $p$.
    ans: C

34. A finite field must have order $q = p^r$ where $p$ is prime and $r \ge 1$. Any two finite fields of the same order are:
    A.  Identical.
    B.  Isomorphic.
    C.  Subfields of each other.
    D.  Algebraically closed.
    E.  Of characteristic 0.
    ans: B

35. The multiplicative group $K^\times$ of non-zero elements of a finite field $K$ is:
    A.  Always trivial.
    B.  Abelian but not necessarily cyclic.
    C.  Cyclic.
    D.  Isomorphic to the additive group $K^+$.
    E.  A $p$-group, where $p=$char(K).
    ans: C

36. The elements of a finite field $K$ of order $q$ are precisely the roots of which polynomial in $K[x]$?
    A.  $x^q - 1$
    B.  $x^{q-1} - 1$
    C.  $x^q + x$
    D.  $x^q - x$
    E.  The minimal polynomial of a generator of $K^\times$.
    ans: D

37. Let $K$ be a finite field of order $q=p^r$. $K$ contains a subfield of order $q'=p^k$ if and only if:
    A.  $k = r$.
    B.  $k$ divides $r$.
    C.  $r$ divides $k$.
    D.  $k$ is prime.
    E.  $q'$ divides $q$.
    ans: B

38. The polynomial $x^4 - x$ factors over $\mathbb{F}_2$ as $x(x-1)(x^2+x+1)$. The field $\mathbb{F}_4$ can be constructed as:
    A.  $\mathbb{Z}/(4)$
    B.  $\mathbb{F}_2[x]/(x^2)$
    C.  $\mathbb{F}_2[x]/(x^2+1)$
    D.  $\mathbb{F}_2[x]/(x^2+x+1)$
    E.  $\mathbb{F}_2 \times \mathbb{F}_2$
    ans: D

39. In the field $\mathbb{F}_8 = \mathbb{F}_2[\beta]/(\beta^3+\beta+1)$, the element $\beta^2+1$ is:
    A.  0
    B.  1
    C.  $\beta$
    D.  One of the elements listed in (6.12).
    E.  Not in $\mathbb{F}_8$.
    ans: D

40. If $f, g$ are two rational functions in $\mathbb{C}(x)$ that agree on infinitely many points in $\mathbb{C}$, then:
    A.  $f=g$ as elements of $\mathbb{C}(x)$.
    B.  $f-g$ must be a constant.
    C.  They must both be polynomials.
    D.  They must have the same poles.
    E.  They might be different elements of $\mathbb{C}(x)$.
    ans: A

41. The Riemann surface of the polynomial $f(x,y) = y^2 - x$ is topologically:
    A.  A sphere.
    B.  A torus (donut shape).
    C.  A plane.
    D.  Two disjoint planes.
    E.  A cylinder.
    ans: C (It's $\mathbb{C}$, which is topologically a plane)

42. A set of elements $\{\alpha_1, \dots, \alpha_n\}$ in an extension $K$ of $F$ is algebraically independent over $F$ if:
    A.  They are linearly independent over $F$.
    B.  No $\alpha_i$ is algebraic over $F$.
    C.  $F(\alpha_1, \dots, \alpha_n)$ is an algebraic extension of $F$.
    D.  There is no non-zero polynomial $f(x_1, \dots, x_n) \in F[x_1, \dots, x_n]$ such that $f(\alpha_1, \dots, \alpha_n)=0$.
    E.  Each $\alpha_i$ is transcendental over $F(\alpha_1, \dots, \alpha_{i-1})$.
    ans: D

43. A transcendence basis for a field extension $K$ of $F$ is a set $S$ of elements in $K$ such that:
    A.  $S$ is algebraically independent over $F$ and $K$ is algebraic over $F(S)$.
    B.  $S$ spans $K$ as an $F$-vector space.
    C.  $K=F(S)$.
    D.  $S$ consists of all transcendental elements of $K$.
    E.  $S$ is finite and $K$ is transcendental over $F(S)$.
    ans: A

44. Any two transcendence bases for a field extension $K/F$:
    A.  Are disjoint.
    B.  Generate the same subfield $F(S)$.
    C.  Have the same cardinality (number of elements).
    D.  Form a basis for $K$ as an $F$-vector space.
    E.  Are finite.
    ans: C

45. A field $F$ is algebraically closed if:
    A.  It has characteristic 0.
    B.  It is finite.
    C.  Every element of $F$ is algebraic over the prime subfield.
    D.  Every non-constant polynomial in $F[x]$ has a root in $F$.
    E.  It has no proper algebraic extensions.
    ans: D

46. The Fundamental Theorem of Algebra states that which field is algebraically closed?
    A.  $\mathbb{Q}$
    B.  $\mathbb{R}$
    C.  $\mathbb{C}$
    D.  $\mathbb{F}_p$ for any prime $p$.
    E.  $\mathbb{Q}(i)$
    ans: C

47. An algebraic closure of a field $F$ is an extension field $K$ such that:
    A.  $K$ is algebraically closed and $[K:F]$ is finite.
    B.  $K$ is algebraic over $F$ and $K$ is algebraically closed.
    C.  $K$ contains all roots of all polynomials in $F[x]$.
    D.  $K=F(\alpha)$ where $\alpha$ is transcendental over $F$.
    E.  $K$ is the field of fractions of $F$.
    ans: B

48. The field $\overline{\mathbb{Q}}$, consisting of all complex numbers algebraic over $\mathbb{Q}$, is:
    A.  $\mathbb{C}$ itself.
    B.  A finite extension of $\mathbb{Q}$.
    C.  An algebraic closure of $\mathbb{Q}$.
    D.  Not a field.
    E.  Countably infinite and algebraically closed.
    ans: E (It is an algebraic closure, and it is countable). C is also correct by definition. E is more descriptive.

49. Every field $F$ has an algebraic closure, and any two algebraic closures of $F$ are:
    A.  Identical.
    B.  Isomorphic via a unique $F$-isomorphism.
    C.  Isomorphic via an $F$-isomorphism (not necessarily unique).
    D.  Unrelated.
    E.  Finite fields.
    ans: C

50. The function field $K = \mathbb{C}(x)[y] / (y^2 - x^3 + x)$ is:
    A.  A pure transcendental extension of $\mathbb{C}$.
    B.  Not a pure transcendental extension of $\mathbb{C}$.
    C.  Isomorphic to $\mathbb{C}(x)$.
    D.  An algebraic extension of $\mathbb{C}$.
    E.  A finite field.
    ans: B

### Chapter 14: Galois Theory

1.  Galois theory connects field extensions with group theory by studying the relationship between:
    A.  Polynomial coefficients and field characteristics.
    B.  The roots of a polynomial and the symmetries among them.
    C.  Transcendental elements and algebraic elements.
    D.  Vector space dimensions and field isomorphisms.
    E.  Ring ideals and quotient fields.
    ans: B

2.  The notation $K/F$ indicates that:
    A.  $K$ is a quotient field of $F$.
    B.  $F$ is an ideal in the ring $K$.
    C.  $K$ is an extension field of $F$.
    D.  $K$ and $F$ are isomorphic fields.
    E.  $K$ is the algebraic closure of $F$.
    ans: C

3.  An $F$-automorphism of an extension field $K$ is an automorphism $\sigma$ of $K$ such that:
    A.  $\sigma(c) = c$ for all $c \in F$.
    B.  $\sigma(c) = c^{-1}$ for all $c \in F$.
    C.  $\sigma(c) = 0$ for all $c \in F$.
    D.  $\sigma(c) = c^p$ where $p = \text{char}(F)$.
    E.  $\sigma(K) = F$.
    ans: A

4.  For a quadratic extension $K = F(\alpha)$ where $\alpha$ is a root of $x^2+bx+c=0$ in $F[x]$, the non-identity $F$-automorphism $\sigma$ sends $\alpha$ to:
    A.  $\alpha$ itself
    B.  $-\alpha$
    C.  $\alpha^{-1}$
    D.  The other root $\alpha' = -b - \alpha$
    E.  $b^2-4c$
    ans: D

5.  The Galois group $G(K/F)$ of a field extension $K/F$ is defined as:
    A.  The group of all automorphisms of $K$.
    B.  The group of all $F$-automorphisms of $K$.
    C.  The group of permutations of the elements of $K$.
    D.  The additive group of $K$.
    E.  The multiplicative group $K^\times$.
    ans: B

6.  A biquadratic extension $K=F(\alpha, \beta)$ where $\alpha^2=a, \beta^2=b$ with $a,b \in F$ and $[K:F]=4$, has a Galois group $G(K/F)$ isomorphic to:
    A.  The cyclic group $C_4$.
    B.  The symmetric group $S_3$.
    C.  The Klein four-group $C_2 \times C_2$.
    D.  The dihedral group $D_4$.
    E.  The trivial group $C_1$.
    ans: C

7.  For any finite extension $K/F$, the order of the Galois group $|G(K/F)|$ relates to the degree $[K:F]$ by:
    A.  $|G(K/F)| = [K:F]$
    B.  $|G(K/F)| > [K:F]$
    C.  $|G(K/F)|$ divides $[K:F]$
    D.  $[K:F]$ divides $|G(K/F)|$
    E.  $|G(K/F)| = [K:F]!$
    ans: C

8.  A finite field extension $K/F$ is called a Galois extension if:
    A.  $[K:F]$ is a prime number.
    B.  $K$ is generated by a single element over $F$.
    C.  $|G(K/F)| = [K:F]$.
    D.  $F$ is the fixed field of $K$.
    E.  $K$ is algebraically closed.
    ans: C

9.  If $G$ is a group of automorphisms of a field $K$, the fixed field $K^G$ is:
    A.  The set of elements moved by all $\phi \in G$.
    B.  The set $\{\phi(\alpha) \mid \alpha \in K, \phi \in G \}$.
    C.  The set $\{\alpha \in K \mid \phi(\alpha) = \alpha \text{ for all } \phi \in G\}$.
    D.  The smallest subfield of $K$.
    E.  The prime subfield of $K$.
    ans: C

10. If $K/F$ is a Galois extension with Galois group $G=G(K/F)$, then the fixed field $K^G$ is:
    A.  $K$ itself
    B.  $F$
    C.  The prime subfield of $F$.
    D.  An intermediate field strictly larger than $F$.
    E.  The trivial field $\{0\}$.
    ans: B

11. A splitting field for a polynomial $f(x) \in F[x]$ is an extension $K$ of $F$ such that $f(x)$ factors into linear factors in $K[x]$, and:
    A.  $K$ contains all roots of unity.
    B.  $K$ is generated over $F$ by the roots of $f(x)$.
    C.  $K$ is algebraically closed.
    D.  $[K:F]$ is the degree of $f(x)$.
    E.  $K$ is a Galois extension of the prime field.
    ans: B

12. A finite extension $K/F$ is a Galois extension if and only if:
    A.  $K$ is generated by a single element.
    B.  $K$ is the splitting field of some polynomial $f(x) \in F[x]$.
    C.  $[K:F]$ is prime.
    D.  $F$ has characteristic 0.
    E.  $K$ has no proper intermediate fields.
    ans: B

13. If $K/F$ is a Galois extension and $L$ is an intermediate field ($F \subseteq L \subseteq K$), then:
    A.  $L/F$ is always a Galois extension.
    B.  $K/L$ is always a Galois extension.
    C.  $L$ must be equal to $F$ or $K$.
    D.  The Galois group $G(K/L)$ is trivial.
    E.  The Galois group $G(L/F)$ is isomorphic to $G(K/F)$.
    ans: B

14. Let $K$ be an extension of $F$, $f(x) \in F[x]$, and $\sigma \in G(K/F)$. If $\alpha \in K$ is a root of $f(x)$, then:
    A.  $\sigma(\alpha)$ must be $\alpha$.
    B.  $\sigma(\alpha)$ is also a root of $f(x)$.
    C.  $\sigma(\alpha)$ is a root of a different polynomial in $F[x]$.
    D.  $\sigma(\alpha)$ must be in $F$.
    E.  $f(\sigma(\alpha))$ is undefined.
    ans: B

15. Let $K = F(\alpha_1, \dots, \alpha_n)$ be a field extension. An $F$-automorphism $\sigma$ of $K$ is the identity automorphism if:
    A.  $\sigma$ fixes any one $\alpha_i$.
    B.  $\sigma$ fixes all the generators $\alpha_1, \dots, \alpha_n$.
    C.  $\sigma$ permutes the generators $\alpha_1, \dots, \alpha_n$.
    D.  $\sigma^2$ is the identity.
    E.  $K/F$ is a Galois extension.
    ans: B

16. The Main Theorem of Galois Theory establishes a correspondence between intermediate fields $L$ (where $F \subseteq L \subseteq K$) and subgroups $H$ of $G(K/F)$. This correspondence is:
    A.  Order-preserving and bijective.
    B.  Order-reversing and bijective.
    C.  Only defined when $G$ is abelian.
    D.  A homomorphism.
    E.  Order-reversing but not necessarily bijective.
    ans: B

17. Under the Galois correspondence for a Galois extension $K/F$ with group $G$, the intermediate field $L$ corresponds to the subgroup $H=G(K/L)$. The degree $[L:F]$ is equal to:
    A.  $|H|$
    B.  $|G|$
    C.  $|G|/|H|$ (the index $[G:H]$)
    D.  $|G| - |H|$
    E.  1
    ans: C

18. Under the Galois correspondence, the field $F$ corresponds to the subgroup ____ and the field $K$ corresponds to the subgroup ____.
    A.  $\{1\}$, $G$
    B.  $G$, $\{1\}$
    C.  $G$, $G$
    D.  $\{1\}$, $\{1\}$
    E.  $Z(G)$, $G$ (center of G)
    ans: B

19. For the biquadratic extension $K = \mathbb{Q}(i, \sqrt{2})$ over $\mathbb{Q}$, the intermediate field $\mathbb{Q}(i)$ corresponds to the subgroup of $G(K/\mathbb{Q})$ generated by:
    A.  Complex conjugation $\sigma$.
    B.  The automorphism $\tau$ sending $\sqrt{2} \mapsto -\sqrt{2}$.
    C.  The composition $\sigma\tau$.
    D.  The identity element.
    E.  The entire group $G(K/\mathbb{Q})$.
    ans: B

20. The discriminant $D$ of an irreducible cubic polynomial $f(x) \in F[x]$ is an element of $F$. The degree of the splitting field $[K:F]$ is 3 if and only if:
    A.  $D=0$.
    B.  $D$ is a square in $F$.
    C.  $D$ is not a square in $F$.
    D.  $f(x)$ has only real roots.
    E.  $F$ contains the cube roots of unity.
    ans: B

21. If $f(x) \in F[x]$ is an irreducible cubic with discriminant $D$ which is not a square in $F$, the Galois group $G(K/F)$ is isomorphic to:
    A.  $C_3$ (cyclic group of order 3)
    B.  $A_3$ (alternating group, same as $C_3$)
    C.  $S_3$ (symmetric group of order 6)
    D.  $C_6$ (cyclic group of order 6)
    E.  $C_2$
    ans: C

22. A polynomial $g(u_1, \dots, u_n)$ is called symmetric if:
    A.  $g(u_1, \dots, u_n) = g(-u_1, \dots, -u_n)$.
    B.  It is fixed by all permutations of the variables $u_i$.
    C.  It is a sum of monomials of the same degree.
    D.  Its value is always positive.
    E.  It is generated by the elementary symmetric polynomials.
    ans: B

23. The Fundamental Theorem of Symmetric Polynomials states that any symmetric polynomial in $R[u_1, \dots, u_n]$ can be written uniquely as:
    A.  A sum of monomial symmetric polynomials.
    B.  A polynomial in the elementary symmetric functions $s_1, \dots, s_n$.
    C.  A product of linear factors $(u_i - u_j)$.
    D.  A rational function in $s_1, \dots, s_n$.
    E.  A polynomial in the power sums $w_k = \sum u_i^k$.
    ans: B

24. The discriminant $D = \prod_{i<j} (u_i - u_j)^2$ is:
    A.  Skew-symmetric.
    B.  Symmetric.
    C.  Neither symmetric nor skew-symmetric.
    D.  Zero only if all $u_i$ are zero.
    E.  Always negative.
    ans: B

25. The Primitive Element Theorem states that any finite extension $K/F$ (assuming characteristic zero) can be written as:
    A.  $K = F(\alpha, \beta)$ for some $\alpha, \beta$.
    B.  $K = F(\gamma)$ for some element $\gamma \in K$.
    C.  A tower of quadratic extensions.
    D.  A splitting field of $x^n - 1$.
    E.  An algebraic closure of $F$.
    ans: B

26. Let $K/F$ be a Galois extension with group $G$. For $\beta \in K$, the irreducible polynomial for $\beta$ over $F$ is:
    A.  $(x-\beta)^{|G|}$
    B.  $x - \beta$ if $\beta \in F$
    C.  $\prod_{g \in G} (x - g(\beta))$
    D.  $\prod_{\beta_i \in \text{Orbit}(\beta)} (x - \beta_i)$
    E.  The minimal polynomial found by linear dependence of powers of $\beta$.
    ans: D

27. If $G$ is a finite group of automorphisms of a field $K$, and $F = K^G$ is the fixed field, then:
    A.  $[K:F]$ divides $|G|$.
    B.  $|G|$ divides $[K:F]$.
    C.  $[K:F] = |G|$.
    D.  $K/F$ is not necessarily algebraic.
    E.  $G$ must be cyclic.
    ans: C

28. In the Main Theorem correspondence for a Galois extension $K/F$, an intermediate field $L$ is a Galois extension of $F$ if and only if the corresponding subgroup $H=G(K/L)$ is:
    A.  A cyclic subgroup of $G$.
    B.  A normal subgroup of $G$.
    C.  The trivial subgroup $\{1\}$.
    D.  The center $Z(G)$.
    E.  Abelian.
    ans: B

29. If $L/F$ is a Galois extension and $H = G(K/L)$ is normal in $G=G(K/F)$, then the Galois group $G(L/F)$ is isomorphic to:
    A.  $H$
    B.  $G$
    C.  $G/H$
    D.  $G \times H$
    E.  The trivial group.
    ans: C

30. The Galois group $G=G(K/F)$ of the splitting field $K$ of an irreducible polynomial $f(x) \in F[x]$ acts transitively on the roots of $f(x)$. This means:
    A.  Every element of $G$ fixes every root.
    B.  For any two roots $\alpha_i, \alpha_j$, there exists $\sigma \in G$ such that $\sigma(\alpha_i) = \alpha_j$.
    C.  The roots form a group under multiplication.
    D.  $G$ must be a cyclic group.
    E.  All roots are equal.
    ans: B

31. Let $K/F$ be the splitting field of an irreducible polynomial $f(x)$ of degree $n$. The element $\delta = \prod_{i<j} (\alpha_i - \alpha_j)$, where $\alpha_i$ are the roots, satisfies $\delta \in F$ if and only if the Galois group $G(K/F)$ is a subgroup of:
    A.  $S_n$
    B.  $A_n$
    C.  $D_n$
    D.  $C_n$
    E.  $V_4$ (Klein four-group, if $n=4$)
    ans: B

32. For an irreducible quartic polynomial $f(x)$, the resolvent cubic $g(x)$ is a cubic polynomial whose roots $\beta_1, \beta_2, \beta_3$ are certain combinations of the roots $\alpha_1, \alpha_2, \alpha_3, \alpha_4$ of $f(x)$. If $g(x)$ has a root in $F$, then the Galois group $G(K/F)$ is a subgroup of:
    A.  $A_4$
    B.  $S_3$
    C.  $V_4$
    D.  $D_4$ (dihedral group of order 8)
    E.  $C_4$
    ans: D

33. According to the table summarizing Galois groups for irreducible quartics, if the discriminant $D$ is a square in $F$ and the resolvent cubic $g(x)$ is irreducible over $F$, the Galois group is:
    A.  $S_4$
    B.  $D_4$
    C.  $C_4$
    D.  $A_4$
    E.  $V_4$
    ans: D

34. An extension $K/F$ is called a Kummer extension if $F$ contains a primitive $p$-th root of unity $\zeta_p$ (for prime $p$), and $K = F(\alpha)$ where:
    A.  $\alpha^p = \alpha$
    B.  $\alpha^p \in F$
    C.  $\alpha$ is a root of $x^p+x^{p-1}+\dots+1=0$
    D.  $F(\alpha)$ is the splitting field of $x^p-1$.
    E.  $\alpha$ is transcendental over $F$.
    ans: B

35. If $K=F(\sqrt[p]{a})$ is a Kummer extension ($a \in F$, $a$ not a $p$-th power in $F$, $\zeta_p \in F$), then the Galois group $G(K/F)$ is isomorphic to:
    A.  $C_p$ (cyclic group of order $p$)
    B.  $S_p$
    C.  $(\mathbb{Z}/p\mathbb{Z})^\times$
    D.  $D_p$
    E.  The trivial group
    ans: A

36. Let $F$ contain a primitive $p$-th root of unity. An extension $K/F$ is Galois with $G(K/F) \cong C_p$ if and only if:
    A.  $K = F(\alpha)$ where $\alpha$ is a root of an irreducible polynomial of degree $p$.
    B.  $K = F(\sqrt[p]{a})$ for some $a \in F$ which is not a $p$-th power in $F$.
    C.  $K$ is the splitting field of $x^p - 1$.
    D.  $[K:F]=p$ and $F$ has characteristic $p$.
    E.  $K$ is generated by a primitive element $\gamma$ whose minimal polynomial has degree $p$.
    ans: B

37. A cyclotomic extension $F(\zeta_n)$ is the splitting field of which polynomial over $F$?
    A.  $x^n + 1$
    B.  $x^n - x$
    C.  $x^n - 1$
    D.  $\Phi_n(x)$ (the $n$-th cyclotomic polynomial)
    E.  $x^n - a$ for some $a \in F$.
    ans: C

38. The Galois group $G(\mathbb{Q}(\zeta_p)/\mathbb{Q})$, where $p$ is prime and $\zeta_p$ is a primitive $p$-th root of unity, is isomorphic to:
    A.  $C_p$
    B.  $S_p$
    C.  $A_p$
    D.  $(\mathbb{Z}/p\mathbb{Z})^\times$ (multiplicative group of integers modulo $p$)
    E.  $D_p$
    ans: D

39. The group $(\mathbb{Z}/p\mathbb{Z})^\times$ is known to be:
    A.  Cyclic of order $p$.
    B.  Cyclic of order $p-1$.
    C.  Non-abelian for $p>3$.
    D.  The Klein four-group if $p=5$.
    E.  Isomorphic to $S_{p-1}$.
    ans: B

40. The unique quadratic subfield of $\mathbb{Q}(\zeta_p)$ (for odd prime $p$) is $\mathbb{Q}(\sqrt{\pm p})$, where the sign is:
    A.  $+$ if $p \equiv 1 \pmod 4$, $-$ if $p \equiv 3 \pmod 4$.
    B.  $-$ if $p \equiv 1 \pmod 4$, $+$ if $p \equiv 3 \pmod 4$.
    C.  Always $+$.
    D.  Always $-$.
    E.  $+$ if $p$ is a Fermat prime.
    ans: A

41. A complex number $\alpha$ is expressible by radicals over $F$ if it belongs to a field $K$ obtained by a tower $F=F_0 \subset F_1 \subset \dots \subset F_r=K$ where each $F_j = F_{j-1}(\beta_j)$ and:
    A.  $\beta_j$ is algebraic over $F_{j-1}$.
    B.  $\beta_j^{n_j} \in F_{j-1}$ for some integer $n_j$.
    C.  $[F_j : F_{j-1}] = 2$ for all $j$.
    D.  $F_j/F_{j-1}$ is a Galois extension.
    E.  $\beta_j$ is a root of unity.
    ans: B

42. Galois' fundamental contribution regarding quintic equations was to show that a polynomial $f(x)$ is solvable by radicals over $F$ if and only if:
    A.  The degree of $f(x)$ is prime.
    B.  The splitting field $K$ contains roots of unity.
    C.  The Galois group $G(K/F)$ is abelian.
    D.  The Galois group $G(K/F)$ is a solvable group.
    E.  $f(x)$ has at least one real root.
    ans: D

43. A group $G$ is solvable if it has a chain of subgroups $G=G_0 \supset G_1 \supset \dots \supset G_r=\{e\}$ such that:
    A.  Each $G_i$ is normal in $G$.
    B.  Each $G_{i+1}$ is normal in $G_i$ and the quotient $G_i/G_{i+1}$ is abelian.
    C.  Each $G_i/G_{i+1}$ is cyclic.
    D.  Each $G_i$ is simple.
    E.  The index $[G_i : G_{i+1}]$ is prime.
    ans: B

44. The groups $S_n$ for $n \ge 5$ are not solvable because:
    A.  They are too large.
    B.  They contain the non-abelian simple subgroup $A_n$.
    C.  They are not cyclic.
    D.  They contain transpositions.
    E.  They cannot be represented by matrices.
    ans: B

45. A specific example of a polynomial over $\mathbb{Q}$ whose roots are not expressible by radicals is $x^5 - 16x + 2$ because:
    A.  Its degree is 5.
    B.  It has no rational roots.
    C.  It is irreducible and has exactly 3 real roots, implying its Galois group is $S_5$.
    D.  Its discriminant is not a square.
    E.  It involves the number 16.
    ans: C

46. If $K/F$ is a Galois extension corresponding to a simple non-abelian group $G$, and $F'/F$ is an abelian extension, then the Galois group of the splitting field $K'$ of the same polynomial over $F'$ is:
    A.  Abelian
    B.  Solvable
    C.  Trivial
    D.  Isomorphic to $G$
    E.  A proper subgroup of $G$.
    ans: D