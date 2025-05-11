# Chapter 1: Matrix Operations

1.  What are the entries $a_{21}$ and $a_{23}$ of the matrix $\begin{bmatrix} 1 & 2 & 5 \\ 2 & 7 & 8 \\ 0 & 9 & 4 \end{bmatrix}$?

2.  Compute the products AB and BA for the following values of A and B.
    (a) $A = \begin{bmatrix} 1 & 2 & 3 \\ 3 & 3 & 1 \end{bmatrix}$, $B = \begin{bmatrix} -8 & -4 \\ 9 & 5 \\ -3 & -2 \end{bmatrix}$
    (b) $A = \begin{bmatrix} 1 & 4 \\ 1 & 2 \end{bmatrix}$, $B = \begin{bmatrix} 6 & -4 \\ -3 & 2 \end{bmatrix}$
    (c) $A = \begin{bmatrix} 1 \\ -1 \\ 0 \end{bmatrix}$, $B = \begin{bmatrix} 1 & 2 & 1 \end{bmatrix}$

3.  Let $A = (a_1, \dots, a_n)$ be a row vector, and let $B = \begin{bmatrix} b_1 \\ \vdots \\ b_n \end{bmatrix}$ be a column vector. Compute the products AB and BA.

4.  Verify the associative law for the matrix product
    $\begin{bmatrix} 1 & 2 \\ 0 & 1 \end{bmatrix} \left( \begin{bmatrix} 0 & 1 & 2 \\ 1 & 1 & 1 \end{bmatrix} \begin{bmatrix} 1 \\ 4 \\ 3 \end{bmatrix} \right) = \left( \begin{bmatrix} 1 & 2 \\ 0 & 1 \end{bmatrix} \begin{bmatrix} 0 & 1 & 2 \\ 1 & 1 & 1 \end{bmatrix} \right) \begin{bmatrix} 1 \\ 4 \\ 3 \end{bmatrix}$.

5.  Compute the product $\begin{bmatrix} 1 & a \\ & 1 \end{bmatrix} \begin{bmatrix} 1 & b \\ & 1 \end{bmatrix}$.

6.  Compute $\begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}^n$.

7.  Find a formula for $\begin{bmatrix} 1 & 1 & \dots & 1 \\ 1 & 1 & \dots & 1 \\ \vdots & \vdots & \ddots & \vdots \\ 1 & 1 & \dots & 1 \end{bmatrix}^n$ (an $n \times n$ matrix), and prove it by induction.
    (The problem statement seems to imply the matrix is $n \times n$ but the power is also $n$. Assuming the power is a general $k$ or the context implies a square matrix of size $N$ raised to power $k$. Given the previous problem, it's likely $\begin{bmatrix} 1 & \dots & 1 \\ \vdots & \ddots & \vdots \\ 1 & \dots & 1 \end{bmatrix}^k$ where the matrix is $N \times N$. Let's assume it's an $N \times N$ matrix of all 1s, raised to power $k$.)
    Find a formula for $M^k$ where $M$ is an $N \times N$ matrix with all entries equal to 1. Prove it by induction.

8.  Compute the following matrix products by block multiplication:
    $\begin{bmatrix} 1 & 1 & | & 1 & 5 \\ 0 & 1 & | & 0 & 1 \\ - & - & - & - & - \\ 1 & 0 & | & 0 & 1 \\ 0 & 1 & | & 1 & 0 \end{bmatrix} \begin{bmatrix} 1 & 2 & | & 1 & 0 \\ 0 & 1 & | & 0 & 1 \\ - & - & - & - & - \\ 1 & 0 & | & 0 & 1 \\ 0 & 1 & | & 1 & 3 \end{bmatrix}$,
    $\begin{bmatrix} 0 & 1 & 2 & | & 1 & 2 & 3 \\ 0 & 1 & 0 & | & 4 & 2 & 3 \\ 3 & 0 & 1 & | & 5 & 0 & 4 \end{bmatrix}$.
    (The second matrix product is incomplete in the OCR, seems like $M M'$ where $M'$ is missing. The first one is likely a product of two block matrices.)
    Let's focus on the first product:
    Compute $\begin{bmatrix} A & B \\ C & D \end{bmatrix} \begin{bmatrix} E & F \\ G & H \end{bmatrix}$ where
    $A = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$, $B = \begin{bmatrix} 1 & 5 \\ 0 & 1 \end{bmatrix}$, $C = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$, $D = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}$
    $E = \begin{bmatrix} 1 & 2 \\ 0 & 1 \end{bmatrix}$, $F = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$, $G = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$, $H = \begin{bmatrix} 0 & 1 \\ 1 & 3 \end{bmatrix}$.

9.  Prove rule (1.20) for block multiplication: $\begin{bmatrix} A & B \\ C & D \end{bmatrix} \begin{bmatrix} A' & B' \\ C' & D' \end{bmatrix} = \begin{bmatrix} AA' + BC' & AB' + BD' \\ CA' + DC' & CB' + DD' \end{bmatrix}$.

10. Let A, B be square matrices.
    (a) When is $(A + B)(A - B) = A^2 - B^2$?
    (b) Expand $(A + B)^3$.

11. Let D be the diagonal matrix
    $D = \begin{bmatrix} d_1 & & & \\ & d_2 & & \\ & & \ddots & \\ & & & d_n \end{bmatrix}$.
    and let $A = (a_{ij})$ be any $n \times n$ matrix.
    (a) Compute the products DA and AD.
    (b) Compute the product of two diagonal matrices.
    (c) When is a diagonal matrix invertible?

12. An $n \times n$ matrix is called upper triangular if $a_{ij} = 0$ whenever $i > j$. Prove that the product of two upper triangular matrices is upper triangular.

13. In each case, find all real $2 \times 2$ matrices which commute with the given matrix.
    (a) $\begin{bmatrix} 1 & 0 \\ 0 & 0 \end{bmatrix}$
    (b) $\begin{bmatrix} 0 & 1 \\ 0 & 0 \end{bmatrix}$
    (c) $\begin{bmatrix} 2 & 0 \\ 0 & 6 \end{bmatrix}$
    (d) $\begin{bmatrix} 1 & 3 \\ 0 & 1 \end{bmatrix}$
    (e) $\begin{bmatrix} 2 & 3 \\ 0 & 6 \end{bmatrix}$

14. Prove the properties $0 + A = A$, $0A = 0$, and $A0 = 0$ of zero matrices.

15. Prove that a matrix which has a row of zeros is not invertible.

16. A square matrix A is called nilpotent if $A^k = 0$ for some $k > 0$. Prove that if A is nilpotent, then $I + A$ is invertible.

17. (a) Find infinitely many matrices B such that $BA = I_2$ when $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \\ 2 & 5 \end{bmatrix}$. (Note: A is $3 \times 2$, so B must be $2 \times 3$. $I_2$ is $2 \times 2$. This seems to be a typo in A's dimension or $I_2$. Assuming A is $2 \times 2$, e.g. $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}$)
    Assuming $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}$, find infinitely many matrices B such that $BA = I_2$. (This is not possible as $A^{-1}$ is unique. The question might imply A is not square, or there is another interpretation. If A is $m \times n$ and B is $n \times m$, BA is $n \times n$. If $A$ is $2 \times k$ and $B$ is $k \times 2$, $BA$ is $k \times k$. The original $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \\ 2 & 5 \end{bmatrix}$ is $3 \times 2$. B must be $2 \times 3$. BA is $2 \times 2$. So this is plausible.)
    Let $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \\ 2 & 5 \end{bmatrix}$. Find infinitely many matrices B such that $BA = I_2$.
    (b) Prove that there is no matrix C such that $AC = I_3$ for the matrix A in (a).

18. Write out the proof of Proposition (1.18) $(AB)^{-1} = B^{-1}A^{-1}$ carefully, using the associative law to expand the product $(AB)(B^{-1}A^{-1})$.

19. The trace of a square matrix is the sum of its diagonal entries: $tr A = a_{11} + a_{22} + \dots + a_{nn}$.
    (a) Show that $tr (A + B) = tr A + tr B$, and that $tr AB = tr BA$.
    (b) Show that if B is invertible, then $tr A = tr BAB^{-1}$.

20. Show that the equation $AB - BA = I$ has no solutions in $n \times n$ matrices with real entries.



21. (a) For the reduction of the matrix $M$ (2.10) given in the text ($M = \begin{bmatrix} 1 & 0 & 2 & 1 & 5 \\ 1 & 1 & 5 & 2 & 7 \\ 1 & 2 & 8 & 4 & 12 \end{bmatrix}$ reduced to $\begin{bmatrix} 1 & 0 & 2 & 0 & 2 \\ 0 & 1 & 3 & 0 & -1 \\ 0 & 0 & 0 & 1 & 3 \end{bmatrix}$), determine the elementary matrices corresponding to each operation.
    (b) Compute the product P of these elementary matrices and verify that PM is indeed the end result.

22. Find all solutions of the system of equations $AX = B$ when
    $A = \begin{bmatrix} 1 & 2 & 1 & 1 \\ 3 & 0 & 0 & 4 \\ 1 & -4 & -2 & -2 \end{bmatrix}$
    and B has the following value:
    (a) $\begin{bmatrix} 0 \\ 0 \\ 0 \end{bmatrix}$
    (b) $\begin{bmatrix} 1 \\ 1 \\ 0 \end{bmatrix}$
    (c) $\begin{bmatrix} 0 \\ 2 \\ 2 \end{bmatrix}$

23. Find all solutions of the equation $x_1 + x_2 + 2x_3 - x_4 = 3$.

24. Determine the elementary matrices which are used in the row reduction in Example (2.22) (inverting $A = \begin{bmatrix} 5 & 4 \\ 6 & 5 \end{bmatrix}$) and verify that their product is $A^{-1}$.

25. Find inverses of the following matrices:
    $\begin{bmatrix} 1 & & \\ & 1 & \\ & 2 & 1 \end{bmatrix}$,
    $\begin{bmatrix} 1 & 1 & \\ & 1 & 1 \\ & & 1 \end{bmatrix}$,
    $\begin{bmatrix} 3 & 5 & \\ & 1 & 2 \\ & & 1 \end{bmatrix}$,
    $\begin{bmatrix} 1 & & & \\ & 1 & & \\ & & 1 & \\ & & 1 & 1 \end{bmatrix}$ (assume $4 \times 4$),
    $\begin{bmatrix} 1 & 3 & 5 \\ & 1 & 2 \\ & & 1 \end{bmatrix}$.

26. Make a sketch showing the effect of multiplication by the matrix $A = \begin{bmatrix} 2 & -1 \\ 2 & 3 \end{bmatrix}$ on the plane $R^2$. (Consider its effect on basis vectors $(1,0)$ and $(0,1)$).

27. How much can a matrix be simplified if both row and column operations are allowed?

28. (a) Compute the matrix product $e_{ij}e_{kl}$ (where $e_{ij}$ is a matrix unit).
    (b) Write the identity matrix as a sum of matrix units.
    (c) Let A be any $n \times n$ matrix. Compute $e_{ii}Ae_{jj}$.
    (d) Compute $e_{ij}A$ and $Ae_{ij}$.

29. Prove rules (2.7) for the operations of elementary matrices. (Type (i): add $a \cdot (row j)$ to $(row i)$, Type (ii): interchange $(row i)$ and $(row j)$, Type (iii): multiply $(row i)$ by $c \ne 0$).

30. Let A be a square matrix. Prove that there is a set of elementary matrices $E_1, \dots, E_k$ such that $E_k \dots E_1 A$ either is the identity or has its bottom row zero.

31. Prove that every invertible $2 \times 2$ matrix is a product of at most four elementary matrices.

32. Prove that if a product AB of $n \times n$ matrices is invertible then so are the factors A, B.

33. A matrix A is called symmetric if $A = A^t$. Prove that for any matrix A, the matrix $AA^t$ is symmetric and that if A is a square matrix then $A + A^t$ is symmetric.

34. (a) Prove that $(AB)^t = B^tA^t$ and that $A^{tt} = A$.
    (b) Prove that if A is invertible then $(A^{-1})^t = (A^t)^{-1}$.

35. Prove that the inverse of an invertible symmetric matrix is also symmetric.

36. Let A and B be symmetric $n \times n$ matrices. Prove that the product AB is symmetric if and only if $AB = BA$.

37. Let A be an $n \times n$ matrix. Prove that the operator "left multiplication by A" determines A in the following sense: If $AX = BX$ for every column vector X, then $A = B$.

38. Consider an arbitrary system of linear equations $AX = B$ where A and B have real entries.
    (a) Prove that if the system of equations $AX = B$ has more than one solution then it has infinitely many.
    (b) Prove that if there is a solution in the complex numbers then there is also a real solution.

*39. Prove that the reduced row echelon form obtained by row reduction of a matrix A is uniquely determined by A.



40. Evaluate the following determinants:
    (a) $\begin{vmatrix} 1 & i \\ 2-i & 3 \end{vmatrix}$
    (b) $\begin{vmatrix} 1 & 1 & 1 \\ 1 & 1 & 0 \\ 1 & 0 & 0 \end{vmatrix}$ (OCR error in source, assuming standard 3x3 form)
    $\begin{vmatrix} 1 & 1 & 1 \\ 1 & 1 & 0 \\ 1 & 0 & 0 \end{vmatrix}$
    (c) $\begin{vmatrix} 2 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 2 \end{vmatrix}$
    (d) $\begin{vmatrix} 1 & 0 & 0 & 0 \\ 5 & 2 & 0 & 0 \\ 8 & 6 & 3 & 0 \\ 0 & 9 & 7 & 4 \end{vmatrix}$
    (e) $\begin{vmatrix} 1 & 4 & 1 & 3 \\ 2 & 3 & 5 & 0 \\ 4 & 1 & 0 & 0 \\ 2 & 0 & 0 & 0 \end{vmatrix}$

41. Prove that $\begin{vmatrix} 1 & 2 & 5 & 6 \\ 3 & 1 & 7 & 7 \\ 0 & 0 & 2 & 3 \\ 4 & 2 & 1 & 5 \end{vmatrix} = -\begin{vmatrix} 2 & 1 & 5 & 1 \\ 1 & 3 & 7 & 0 \\ 0 & 0 & 2 & 1 \\ 2 & 4 & 1 & 4 \end{vmatrix}$. (The second matrix structure is slightly different in OCR, trying to make it plausible for a simple property.)
    (The problem likely shows a property like row/column interchange or transposition with some values changed. The given matrices don't seem directly related by simple operations for the determinant to be just a negative. Re-interpreting "prove that det = -det for specific matrices" to mean verification for given matrices.)
    Evaluate $\det \begin{pmatrix} 1 & 2 & 5 & 6 \\ 3 & 1 & 7 & 7 \\ 0 & 0 & 2 & 3 \\ 4 & 2 & 1 & 5 \end{pmatrix}$ and $\det \begin{pmatrix} 2 & 1 & 5 & 1 \\ 1 & 3 & 7 & 0 \\ 0 & 0 & 2 & 1 \\ 2 & 4 & 1 & 4 \end{pmatrix}$ and check if one is the negative of the other.

42. Verify the rule $\det AB = (\det A)(\det B)$ for the matrices $A = \begin{bmatrix} 2 & 3 \\ 1 & 4 \end{bmatrix}$, $B = \begin{bmatrix} 1 & 1 \\ 5 & -2 \end{bmatrix}$. Note that this is a self-checking problem. It can be used as a model for practice in computing determinants.

43. Compute the determinant of the following $n \times n$ matrices by induction on $n$.
    (a) $\begin{vmatrix} 1 & 1 & & & \\ & 1 & 1 & & \\ & & \ddots & \ddots & \\ & & & 1 & 1 \\ & & & & 1 \end{vmatrix}$ (1s on diagonal and superdiagonal, 0s elsewhere)
    (b) $\begin{vmatrix} 2 & -1 & & & \\ -1 & 2 & -1 & & \\ & \ddots & \ddots & \ddots & \\ & & -1 & 2 & -1 \\ & & & -1 & 2 \end{vmatrix}$

44. Evaluate $\det \begin{pmatrix} 1 & 2 & 3 & \dots & n \\ 2 & 2 & 3 & \dots & n \\ 3 & 3 & 3 & \dots & n \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ n & n & n & \dots & n \end{pmatrix}$.

*45. Compute $\det \begin{pmatrix} 2 & 1 & & & & \\ 1 & 2 & 1 & & & \\ & 1 & 2 & 1 & & \\ & & \ddots & \ddots & \ddots & \\ & & & 1 & 2 & 1 \\ & & & & 1 & 2 \end{pmatrix}$ (an $n \times n$ matrix).

46. Prove that the determinant is linear in the rows of a matrix, as asserted in (3.6).

47. Let A be an $n \times n$ matrix. What is $\det (-A)$?

48. Prove that $\det A^t = \det A$.

49. Derive the formula $\det \begin{bmatrix} a & b \\ c & d \end{bmatrix} = ad - bc$ from the properties (3.5, 3.6, 3.7, 3.9).
    (Properties are: det(I)=1, linear in rows, det=0 if two adjacent rows equal, det changes sign if two adjacent rows interchanged).

50. Let A and B be square matrices. Prove that $\det(AB) = \det(BA)$.

51. Prove that $\det \begin{bmatrix} A & B \\ 0 & D \end{bmatrix} = (\det A)(\det D)$, if A and D are square blocks.

*52. Let a $2n \times 2n$ matrix be given in the form $M = \begin{bmatrix} A & B \\ C & D \end{bmatrix}$, where each block is an $n \times n$ matrix. Suppose that A is invertible and that $AC = CA$. Prove that $\det M = \det(AD - CB)$. Give an example to show that this formula need not hold when $AC \ne CA$.



53. Consider the permutation $p$ defined by $1 \mapsto 3$, $2 \mapsto 1$, $3 \mapsto 4$, $4 \mapsto 2$.
    (a) Find the associated permutation matrix P.
    (b) Write $p$ as a product of transpositions and evaluate the corresponding matrix product.
    (c) Compute the sign of $p$.

54. Prove that every permutation matrix is a product of transpositions (elementary matrices of type (ii)).

55. Prove that every matrix with a single 1 in each row and a single 1 in each column, the other entries being zero, is a permutation matrix.

56. Let $p$ be a permutation. Prove that $\text{sign } p = \text{sign } p^{-1}$.

57. Prove that the transpose of a permutation matrix P is its inverse.

58. What is the permutation matrix associated to the permutation $i \mapsto n-i+1$ (for $i=1, \dots, n$)?

59. (a) The complete expansion for the determinant of a $3 \times 3$ matrix consists of six triple products of matrix entries, with sign. Learn which they are.
    (b) Compute the determinant of the following matrices using the complete expansion, and check your work by another method:
    $\begin{bmatrix} 1 & 1 & 2 \\ 2 & 4 & 2 \\ 0 & 2 & 1 \end{bmatrix}$,
    $\begin{bmatrix} 4 & -1 & 1 \\ 1 & 1 & -2 \\ 1 & -1 & 1 \end{bmatrix}$,
    $\begin{bmatrix} a & b & c \\ 1 & 1 & -2 \\ 1 & 0 & 1 \\ 1 & 1 & 1 \end{bmatrix}$ (Typo in last matrix, likely $3 \times 3$)
    Correcting last matrix to be $3 \times 3$: $\begin{bmatrix} a & b & c \\ 1 & 0 & 1 \\ 1 & 1 & 1 \end{bmatrix}$.

60. Prove that the complete expansion (4.12) defines the determinant by verifying rules (3.5-3.7).

61. Prove that formulas (4.11) and (4.12) (complete expansions over column permutations and row permutations) define the same number.



62. Let $\begin{bmatrix} a & b \\ c & d \end{bmatrix}$ be a matrix with determinant 1. What is $A^{-1}$?

63. (Self-checking) Compute the adjoints of the matrices
    $\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$,
    $\begin{bmatrix} 1 & 1 & 2 \\ 2 & 4 & 2 \\ 0 & 2 & 1 \end{bmatrix}$,
    $\begin{bmatrix} 4 & -1 & 1 \\ 1 & 1 & -2 \\ 1 & -1 & 1 \end{bmatrix}$
    and for $\begin{bmatrix} a & b & c \\ 1 & 0 & 1 \\ 1 & 1 & 1 \end{bmatrix}$, verify Theorem (5.7) (A(adj A) = (det A)I) for them.

64. Let A be an $n \times n$ matrix with integer entries $a_{ij}$. Prove that $A^{-1}$ has integer entries if and only if $\det A = \pm 1$.

65. Prove that expansion by minors on a row of a matrix defines the determinant function (i.e., satisfies the characterizing properties of determinants).


66. Write the matrix $\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$ as a product of elementary matrices, using as few as you can. Prove that your expression is as short as possible.

67. Find a representation of the complex numbers by real $2 \times 2$ matrices which is compatible with addition and multiplication. Begin by finding a nice solution to the matrix equation $A^2 = -I$.

68. (Vandermonde determinant)
    (a) Prove that $\det \begin{pmatrix} 1 & 1 & 1 \\ a & b & c \\ a^2 & b^2 & c^2 \end{pmatrix} = (b - a)(c - a)(c - b)$.
    *(b) Prove an analogous formula for $n \times n$ matrices by using row operations to clear out the first column cleverly. (The general Vandermonde determinant is $\det(V_{ij}) = \det(x_i^{j-1})$).

*69. Consider a general system $AX = B$ of $m$ linear equations in $n$ unknowns. If the coefficient matrix A has a left inverse $A'$, a matrix such that $A'A = I_n$, then we may try to solve the system as follows:
    $AX = B \implies A'AX = A'B \implies X = A'B$.
    But when we try to check our work by running the solution backward, we get into trouble:
    $X = A'B \implies AX = AA'B$.
    This implies $AX \stackrel{?}{=} B$.
    We seem to want $A'$ to be a right inverse: $AA' = I_m$, which isn't what was given. Explain. (Hint: Work out some examples.)

70. (a) Let A be a real $2 \times 2$ matrix, and let $A_1, A_2$ be the rows of A. Let P be the parallelogram whose vertices are $0, A_1, A_2, A_1 + A_2$. Prove that the area of P is the absolute value of the determinant $\det A$ by comparing the effect of an elementary row operation on the area and on $\det A$.
    *(b) Prove an analogous result for $n \times n$ matrices (volume of parallelepiped).

*71. Most invertible matrices can be written as a product $A = LU$ of a lower triangular matrix L and an upper triangular matrix U, where in addition all diagonal entries of U are 1.
    (a) Prove uniqueness, that is, prove that there is at most one way to write A as a product.
    (b) Explain how to compute L and U when the matrix A is given.
    (c) Show that every invertible matrix can be written as a product $LPU$, where L, U are as above and P is a permutation matrix.

72. Consider a system of $n$ linear equations in $n$ unknowns: $AX = B$, where A and B have integer entries. Prove or disprove the following.
    (a) The system has a rational solution if $\det A \ne 0$.
    (b) If the system has a rational solution, then it also has an integer solution.

*73. Let A, B be $m \times n$ and $n \times m$ matrices. Prove that $I_m - AB$ is invertible if and only if $I_n - BA$ is invertible.

74. Define a matrix and specify its dimensions (order). Give an example of a $3 \times 2$ matrix.

75. Explain the difference between a row vector and a column vector. Can a $1 \times 1$ matrix be considered both?

76. If $A = \begin{bmatrix} 1 & -2 \\ 0 & 3 \end{bmatrix}$ and $B = \begin{bmatrix} 4 & 0 \\ -1 & 5 \end{bmatrix}$, calculate $2A - B$.

77. Prove the associative law for matrix addition: $(A+B)+C = A+(B+C)$.

78. If $A$ is an $m \times n$ matrix and $B$ is a $p \times q$ matrix, under what conditions are both $AB$ and $BA$ defined? What can you say about the dimensions of $A$ and $B$ if $AB$ and $BA$ are both defined and have the same dimensions?

79. Give an example of two $2 \times 2$ matrices $A$ and $B$ such that $AB \ne BA$.

80. If $A^2 = I$ (where $I$ is the identity matrix), does it imply that $A=I$ or $A=-I$? Provide a counterexample if false.

81. Show that if $A$ is an $n \times n$ matrix and $A^k = 0$ for some positive integer $k$ (A is nilpotent), then $A$ cannot be invertible.

82. Find a $2 \times 2$ matrix $A \ne 0$ such that $A^2 = 0$.

83. Describe the three types of elementary row operations. For each type, write down the corresponding $3 \times 3$ elementary matrix that would perform this operation on a $3 \times k$ matrix.

84. Prove that the inverse of an elementary matrix of Type (i) (adding $a$ times row $j$ to row $i$) is also an elementary matrix of Type (i). What is it?

85. Use Gaussian elimination (row reduction) to solve the system:
    $x + y + z = 6$
    $2x - y + z = 3$
    $x + 2y - z = 2$

86. Determine if the matrix $A = \begin{bmatrix} 1 & 2 & 3 \\ 0 & 1 & 4 \\ 0 & 0 & 1 \end{bmatrix}$ is invertible. If so, find its inverse using elementary row operations.

87. For what values of $k$ is the matrix $A = \begin{bmatrix} 1 & k \\ k & 4 \end{bmatrix}$ not invertible?

88. Let $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$. Calculate $A^T A$ and $A A^T$. Are they equal?

89. If $A$ and $B$ are symmetric matrices of the same size, prove that $A+B$ is also symmetric.

90. Show that any square matrix $A$ can be written as the sum of a symmetric matrix and a skew-symmetric matrix. (A matrix $S$ is skew-symmetric if $S^T = -S$).

91. Calculate the determinant of $A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{bmatrix}$. Is this matrix invertible?

92. If $\det(A) = 3$ and $\det(B) = -2$ for $n \times n$ matrices $A$ and $B$, find $\det(A B)$, $\det(A^{-1})$, $\det(B^T)$, and $\det(2A)$ (assume $n=3$).

93. If $A$ is an $n \times n$ matrix such that $A^T = -A$ (A is skew-symmetric) and $n$ is odd, prove that $\det(A) = 0$. What if $n$ is even?

94. Use the properties of determinants to show that $\det \begin{pmatrix} a+x & b+y & c+z \\ x & y & z \\ 1 & 1 & 1 \end{pmatrix} = \det \begin{pmatrix} a & b & c \\ x & y & z \\ 1 & 1 & 1 \end{pmatrix}$.

95. Let $P$ be a permutation matrix corresponding to the permutation $p$ that swaps elements 1 and 2 in a set of 3 elements (i.e., $p(1)=2, p(2)=1, p(3)=3$). Write down $P$ and calculate $\det(P)$. What is the sign of this permutation?

96. Explain why the product of two permutation matrices is always a permutation matrix.

97. Find the adjoint of the matrix $A = \begin{bmatrix} 1 & 0 & 2 \\ 2 & -1 & 3 \\ 4 & 1 & 8 \end{bmatrix}$. Use it to find $A^{-1}$ if it exists.

98. Solve the following system using Cramer's Rule:
    $2x - y = 3$
    $x + 3y = -2$

99. If $A$ is an $m \times n$ matrix and $B$ is an $n \times p$ matrix, prove that $(AB)^T = B^T A^T$.

100. What does it mean for a set of vectors (rows or columns of a matrix) to be linearly dependent in the context of determinants? How does this relate to the value of the determinant?

101. If an $n \times n$ matrix $A$ has $rank(A) < n$, what can you say about $\det(A)$ and the invertibility of $A$?

102. Consider a $3 \times 3$ diagonal matrix $D$ with diagonal entries $d_1, d_2, d_3$. What is $\det(D)$? What is $adj(D)$? When is $D$ invertible?

103. If $A$ is an invertible matrix and $A^{-1} = A^T$, what is the special name for such a matrix $A$? What can you say about $\det(A)$?

104. Prove that if $A$ is a square matrix and $A^2=A$ (A is idempotent), then $\det(A)$ is either 0 or 1.

105. Let $A$ be an $n \times n$ matrix. If $A \mathbf{x} = \lambda \mathbf{x}$ for some non-zero vector $\mathbf{x}$ and scalar $\lambda$, show that $\det(A - \lambda I) = 0$. (This relates to eigenvalues).

106. What is the effect on the determinant of a $4 \times 4$ matrix if you perform the following sequence of row operations: $R_1 \leftrightarrow R_3$, then $R_2 \rightarrow R_2 - 2R_1$, then $R_4 \rightarrow 3R_4$?

107. If $A$ is an $m \times n$ matrix such that $m < n$, can $AA^T$ be invertible? Can $A^T A$ be invertible? Explain.

108. Explain the geometric interpretation of the determinant of a $2 \times 2$ matrix in terms of area.

109. If $P$ is a permutation matrix obtained by an odd number of row interchanges from the identity matrix, what is $\det(P)$?

110. Can you find a $2 \times 2$ matrix $A$ such that $A \ne I$ but $A^3 = I$? What would $\det(A)$ be?

111. If $A$ is an $n \times n$ matrix and $c$ is a scalar, prove that $\det(cA) = c^n \det(A)$.

112. Show that the determinant of an upper triangular matrix (or lower triangular matrix) is the product of its diagonal entries.

113. Consider the system $AX=B$. If $\det(A)=0$, what are the possibilities for the number of solutions to the system? Explain with examples.

114. Prove that if two columns of a square matrix $A$ are identical, then $\det(A)=0$.

115. Given $A = \begin{bmatrix} 1 & 2 \\ 0 & 1 \end{bmatrix}$ and $B = \begin{bmatrix} 1 & 0 \\ 3 & 1 \end{bmatrix}$. Verify that $\det(AB) = \det(A)\det(B)$.

116. If $A$ is an invertible $n \times n$ matrix, show that $\text{adj}(A^{-1}) = (\text{adj } A)^{-1}$.

# Chapter 2: GROUPS

1.  (a) Verify (1.17) and (1.18) from the text by explicit computation. (b) Make a multiplication table for $S_3$.
    *(Text reference: (1.17) $\{1, x, x^2, y, xy, x^2y\} = \{x^i y^j \mid 0 \le i \le 2, 0 \le j \le 1\}$, (1.18) $x^3=1, y^2=1, yx=x^2y$ for $S_3$)*


2.  (a) Prove that $GL_n(\mathbb{R})$ (the set of $n \times n$ invertible real matrices) is a group under matrix multiplication. (b) Prove that $S_n$ (the set of permutations of $\{1, ..., n\}$) is a group under composition of functions.
   - Difficulty: Easy
   - Type: Calculation
   - Topics: units, volume

3.  Let S be a set with an associative law of composition and with an identity element. Prove that the subset of S consisting of invertible elements is a group.

4.  Solve for y, given that $xyz^{-1}w = 1$ in a group G (where x, z, w are elements of G).

5.  Assume that the equation $xyz = 1$ holds in a group G. Does it necessarily follow that $yzx = 1$? Does it necessarily follow that $yxz = 1$? Justify your answers.

6.  Write out all five distinct ways in which one can form a product of four elements a, b, c, d in that given order using an associative binary operation (e.g., $((ab)c)d$, $(ab)(cd)$, etc.).

7.  Let S be any set. Prove that the law of composition defined by $ab = a$ for all $a, b \in S$ is associative. Does this law have an identity element? If so, are elements invertible?

8.  Give an example of $2 \times 2$ matrices A and B such that $A^{-1}B \ne BA^{-1}$.

9.  Show that if $ab = a$ in a group G, then $b = 1$ (where 1 is the identity element). Also, show that if $ab = 1$ in a group G, then $b = a^{-1}$.

10. Let a, b be elements of a group G. Show that the equation $ax = b$ has a unique solution for x in G. Similarly, show that $ya = b$ has a unique solution for y in G.

11. Let G be a group, with multiplicative notation. We define an "opposite group" $G^o$ with law of composition $a \circ b$ as follows: The underlying set is the same as G, but the law of composition is defined by $a \circ b = ba$ (where ba is the product in G). Prove that $G^o$ is a group.

12. Determine the elements of the cyclic group generated by the matrix $\begin{pmatrix} 1 & 1 \\ -1 & 0 \end{pmatrix}$ explicitly. What is the order of this group?

13. Let a, b be elements of a group G. Assume that a has order 5 and that $a^3b = ba^3$. Prove that $ab = ba$.

14. Which of the following are subgroups? Justify your answers.
    (a) $GL_n(\mathbb{R})$ as a subset of $GL_n(\mathbb{C})$.
    (b) $\{1, -1\}$ as a subset of $\mathbb{R}^\times$ (non-zero reals under multiplication).
    (c) The set of positive integers in $\mathbb{Z}^+$ (integers under addition).
    (d) The set of positive reals in $\mathbb{R}^\times$.
    (e) The set of all matrices of the form $\begin{pmatrix} a & 0 \\ 0 & 0 \end{pmatrix}$ with $a \ne 0$, as a subset of $GL_2(\mathbb{R})$.

15. Prove that a nonempty subset H of a group G is a subgroup if and only if for all $x, y \in H$, the element $xy^{-1}$ is also in H.

16. An nth root of unity is a complex number z such that $z^n = 1$. Prove that the set of all nth roots of unity forms a cyclic subgroup of $\mathbb{C}^\times$ (non-zero complex numbers under multiplication) of order n.

17. (a) The Klein four group V can be represented by permutations or matrices. Find a set of generators for V and describe the relations between them (analogous to (2.13) for quaternions). For example, $V = \{e, a, b, ab\}$ where $a^2=e, b^2=e, ab=ba$. (b) Find all subgroups of the Klein four group.

18. Let a and b be integers.
    (a) Prove that the subset $a\mathbb{Z} + b\mathbb{Z} = \{ax + by \mid x, y \in \mathbb{Z}\}$ is a subgroup of $\mathbb{Z}^+$ (integers under addition).
    (b) Prove that the subgroup generated by a and $b + 7a$ is the same as the subgroup $a\mathbb{Z} + b\mathbb{Z}$.

19. Make a complete multiplication table for the quaternion group $H = \{\pm 1, \pm i, \pm j, \pm k\}$.

20. Let H be the subgroup generated by two elements a,b of a group G. Prove that if $ab = ba$, then H is an abelian group.

21. (a) Assume that an element x of a group has order rs (where r, s are positive integers). Find the order of $x^r$. (b) Assuming that x has arbitrary order n, what is the order of $x^k$ for an integer k? (Express in terms of n and gcd(n,k)).

22. Prove that in any group G, the order of an element ab is equal to the order of ba, for any $a, b \in G$.

23. Describe all groups G which contain no proper non-trivial subgroups (i.e., the only subgroups are $\{1\}$ and G itself).

24. Prove that every subgroup of a cyclic group is cyclic.

25. Let G be a cyclic group of order n, and let r be a positive integer dividing n. Prove that G contains exactly one subgroup of order r.

26. (a) In the definition of a subgroup H of G, the identity element in H is required to be the identity $1_G$ of G. Suppose we defined a "weak subgroup" H as a subset of G that is itself a group under the operation of G, but its identity $1_H$ might not be $1_G$. Show that if H has an identity $1_H$ at all, then $1_H$ must be $1_G$. (b) Show the analogous thing for inverses: if an element $h \in H$ has an inverse $h' \in H$ with respect to $1_H$ (i.e., $hh'=h'h=1_H$), then $h'$ is also the inverse of h in G.

27. (a) Let G be a cyclic group of order 6. How many of its elements generate G? (b) Answer the same question for cyclic groups of order 5, 8, and 10. (c) How many elements of a cyclic group of order n are generators for that group? (Express your answer in terms of Euler's totient function $\phi(n)$).

28. Prove that a group in which every element except the identity has order 2 is abelian.

29. (Text reference: Chapter 1 (2.18) states elementary matrices generate $GL_n(\mathbb{R})$.)
    (a) Elementary matrices are of three types: $E_{ij}$ (swap row i and j), $E_i(c)$ (multiply row i by $c \ne 0$), $E_{ij}(c)$ (add c times row j to row i). Prove that the elementary matrices of type $E_{ij}$ and $E_{ij}(c)$ (swapping rows and adding a multiple of one row to another) suffice to generate $GL_n(\mathbb{R})$.
    (b) The special linear group $SL_n(\mathbb{R})$ is the set of real $n \times n$ matrices whose determinant is 1. Show that $SL_n(\mathbb{R})$ is a subgroup of $GL_n(\mathbb{R})$.
    *(c) Use row reduction to prove that the elementary matrices of type $E_{ij}(c)$ (adding c times row j to row i) generate $SL_n(\mathbb{R})$. Do the $2 \times 2$ case first.

30. Determine the number of elements of order 2 in the symmetric group $S_4$. Describe their cycle structures.

31. (a) Let a, b be elements of an abelian group G with orders m, n respectively. What can you say about the order of their product ab? *(b) Show by example that the product of elements of finite order in a nonabelian group need not have finite order.

32. Prove that the set of elements of finite order in an abelian group G forms a subgroup of G. (This subgroup is called the torsion subgroup of G).

33. Prove that the greatest common divisor d of two integers a and b, as defined in the text (i.e., $d > 0$ and $d\mathbb{Z} = a\mathbb{Z} + b\mathbb{Z}$), can be obtained by factoring a and b into prime integers and then collecting the common prime factors raised to the minimum powers they appear in either factorization.

34. Prove that the additive group $\mathbb{R}$ of real numbers is isomorphic to the multiplicative group $P = \{x \in \mathbb{R} \mid x > 0\}$ of positive real numbers.

35. Prove that for any elements a, b in a group G, the products ab and ba are conjugate elements in G.

36. Let a, b be elements of a group G, and let $a' = bab^{-1}$. Prove that $a = a'$ if and only if a and b commute.

37. (a) Let $b' = aba^{-1}$ for $a, b \in G$. Prove that $(b')^n = ab^na^{-1}$ for any integer n. (b) Prove that if $aba^{-1} = b^2$, then $a^3ba^{-3} = b^8$.

38. Let $\phi: G \to G'$ be an isomorphism of groups. Prove that the inverse function $\phi^{-1}: G' \to G$ is also an isomorphism.

39. Let $\phi: G \to G'$ be an isomorphism of groups, let $x, y \in G$, and let $x' = \phi(x)$ and $y' = \phi(y)$.
    (a) Prove that the orders of x and of x' are equal.
    (b) Prove that if $xyx = yxy$, then $x'y'x' = y'x'y'$.
    (c) Prove that $\phi(x^{-1}) = (\phi(x))^{-1}$.

40. Prove that the matrices $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$ and $B = \begin{pmatrix} 1 & 0 \\ 1 & 1 \end{pmatrix}$ are conjugate elements in the group $GL_2(\mathbb{R})$ but that they are not conjugate when regarded as elements of $SL_2(\mathbb{R})$.

41. Prove that the matrices $A = \begin{pmatrix} 1 & 2 \\ 0 & 1 \end{pmatrix}$ and $B = \begin{pmatrix} 1 & 3 \\ 0 & 1 \end{pmatrix}$ are conjugate in $GL_2(\mathbb{R})$. Are they conjugate in $SL_2(\mathbb{R})$?

42. Find an isomorphism from a group G to its opposite group $G^o$ (defined in Problem 11).

43. Prove that the map $\alpha: GL_n(\mathbb{R}) \to GL_n(\mathbb{R})$ defined by $A \mapsto (A^t)^{-1}$ (inverse of the transpose) is an automorphism of $GL_n(\mathbb{R})$.

44. Prove that the set Aut(G) of all automorphisms of a group G forms a group under the law of composition being composition of functions.

45. Let G be a group, and let $\phi: G \to G$ be the map $\phi(x) = x^{-1}$.
    (a) Prove that $\phi$ is bijective.
    (b) Prove that $\phi$ is an automorphism if and only if G is abelian.

46. (a) Let G be a group of order 4. Prove that every element of G has order 1, 2, or 4.
    (b) Classify all groups of order 4 up to isomorphism by considering the following two cases:
    (i) G contains an element of order 4.
    (ii) Every element of G (other than identity) has order 2.

47. Determine the group of automorphisms for each of the following groups:
    (a) $\mathbb{Z}$ (integers under addition).
    (b) A cyclic group of order 10.
    (c) The symmetric group $S_3$.

48. Show that the functions $f(x) = 1/x$ and $g(x) = (x-1)/x$ (defined for $x \ne 0, 1$) generate a group of functions under composition, which is isomorphic to the symmetric group $S_3$.

49. Give an example of two isomorphic groups G and G' such that there is more than one distinct isomorphism from G to G'.

50. Let G be a group, with its law of composition written $x \# y$. Let H be a group with its law of composition written $u \diamond v$. What is the precise condition for a map $\phi: G \to H$ to be a homomorphism?

51. Let $\phi: G \to G'$ be a group homomorphism. Prove that for any elements $a_1, ..., a_k$ of G, $\phi(a_1 a_2 \cdots a_k) = \phi(a_1) \phi(a_2) \cdots \phi(a_k)$.

52. Prove that the kernel of a group homomorphism $\phi: G \to G'$ is a subgroup of G, and the image of $\phi$ is a subgroup of G'.

53. Describe all homomorphisms $\phi: \mathbb{Z} \to \mathbb{Z}$ (where $\mathbb{Z}$ is the group of integers under addition). Determine which of these are injective, which are surjective, and which are isomorphisms.

54. Let G be an abelian group. Prove that for any integer n, the map $\phi_n: G \to G$ defined by $\phi_n(x) = x^n$ is a homomorphism from G to itself. What if G is not abelian? Give a counterexample.

55. Let $f: \mathbb{R} \to \mathbb{C}^\times$ be the map $f(x) = e^{ix} = \cos x + i \sin x$ (where $\mathbb{R}$ is under addition and $\mathbb{C}^\times$ is under multiplication). Prove that f is a homomorphism, and determine its kernel and image.

56. Prove that the absolute value map $| \cdot |: \mathbb{C}^\times \to \mathbb{R}^\times$ sending $z \mapsto |z|$ (where $\mathbb{R}^\times$ consists of non-zero reals under multiplication) is a homomorphism. Determine its kernel and image. (Note: image is positive reals $P$).

57. (a) Find all subgroups of $S_3$. Determine which of these subgroups are normal in $S_3$. (b) Find all subgroups of the quaternion group Q$_8$. Determine which of these subgroups are normal in Q$_8$.

58. (a) Prove that if $\psi: G \to G'$ and $\phi: G' \to G''$ are two group homomorphisms, then their composition $\phi \circ \psi: G \to G''$ is also a homomorphism. (b) Describe the kernel of $\phi \circ \psi$ in terms of ker $\phi$ and ker $\psi$ (or their images/preimages). Specifically, show $ker(\phi \circ \psi) = \psi^{-1}(ker \phi)$.

59. Let $\phi: G \to G'$ be a group homomorphism. Prove that $\phi(x) = \phi(y)$ if and only if $xy^{-1} \in \ker \phi$ (or equivalently, $y^{-1}x \in \ker \phi$).

60. Let G and H be cyclic groups, generated by elements x and y, respectively. Let ord(x) = m and ord(y) = n. Determine the conditions on m, n, and an integer k such that the map $\alpha: G \to H$ defined by $\alpha(x^i) = y^{ki}$ for all integers i is a well-defined group homomorphism.

61. Let P be the set of $n \times n$ real matrices M which have the block form $\begin{pmatrix} A & B \\ 0 & D \end{pmatrix}$ where $A \in GL_r(\mathbb{R})$ and $D \in GL_{n-r}(\mathbb{R})$ (0 is a zero matrix of appropriate size). Prove that P is a subgroup of $GL_n(\mathbb{R})$. Show that the map $\pi: P \to GL_r(\mathbb{R})$ sending $M \mapsto A$ is a homomorphism. What is its kernel?

62. (a) Let H be a subgroup of G, and let $g \in G$. The set $gHg^{-1} = \{ghg^{-1} \mid h \in H\}$ is called a conjugate subgroup of H. Prove that $gHg^{-1}$ is indeed a subgroup of G. (b) Prove that a subgroup H of a group G is normal in G if and only if $gHg^{-1} = H$ for all $g \in G$.

63. Let N be a normal subgroup of G. Prove that for any $g \in G$ and any $n \in N$, $g^{-1}ng \in N$. (This is part of the definition of normal, or an equivalent condition).

64. Let $\phi: G \to G'$ and $\psi: G \to G'$ be two homomorphisms from a group G to another group G'. Let $H = \{x \in G \mid \phi(x) = \psi(x)\}$. Prove or disprove: H is always a subgroup of G.

65. Let $\phi: G \to G'$ be a group homomorphism, and let $x \in G$ be an element of order r. What can you say about the order of $\phi(x)$ in G'? Prove your statement.

66. Prove that the center $Z(G) = \{z \in G \mid zg = gz \text{ for all } g \in G\}$ of a group G is a normal subgroup of G.

67. Prove that the center of $GL_n(\mathbb{R})$ is the subgroup of scalar matrices $Z = \{cI \mid c \in \mathbb{R}, c \ne 0\}$, where I is the $n \times n$ identity matrix.

68. Prove that if a group G contains exactly one element of order 2, then that element must be in the center of G.

69. Consider the set U of real $3 \times 3$ upper triangular matrices with 1s on the diagonal: $U = \left\{ \begin{pmatrix} 1 & a & b \\ 0 & 1 & c \\ 0 & 0 & 1 \end{pmatrix} \mid a, b, c \in \mathbb{R} \right\}$.
    (a) Prove that U is a subgroup of $SL_3(\mathbb{R})$.
    (b) Prove or disprove: U is a normal subgroup of $GL_3(\mathbb{R})$.
    *(c) Determine the center of U.

70. Prove by giving an explicit example that $GL_2(\mathbb{R})$ is not a normal subgroup of $GL_2(\mathbb{C})$.

71. Let $\phi: G \to G'$ be a surjective homomorphism.
    (a) Assume that G is cyclic. Prove that G' is cyclic.
    (b) Assume that G is abelian. Prove that G' is abelian.

72. Let $\phi: G \to G'$ be a surjective homomorphism, and let N be a normal subgroup of G. Prove that $\phi(N) = \{\phi(n) \mid n \in N\}$ is a normal subgroup of G'.

73. Prove that the nonempty fibres of any map $f: S \to T$ form a partition of the domain S.

74. Let $\mathcal{G}$ be a collection of groups. Prove that the relation "G is isomorphic to H" ($G \approx H$) is an equivalence relation on $\mathcal{G}$.

75. Determine the number of distinct equivalence relations on a set of three elements. List the corresponding partitions. (The original question was for five elements, which is more complex - Bell number $B_5=52$. $B_3=5$).

76. Let R and R' be two equivalence relations on a set S.
    (a) Is their intersection $R \cap R'$ (regarded as subsets of $S \times S$) always an equivalence relation? Justify.
    (b) Is their union $R \cup R'$ always an equivalence relation? Justify.

77. Let H be a subgroup of a group G. Prove that the relation $\sim_L$ defined on G by $a \sim_L b$ if $a^{-1}b \in H$ is an equivalence relation on G. What are the equivalence classes? (This defines left cosets $aH$ if $a^{-1}b \in H \implies b \in aH$). The problem states $b^{-1}a \in H$. This implies $a \in bH$, so $aH = bH$. This is right congruence. $a \sim_R b$ if $ab^{-1} \in H$. Equivalence classes are right cosets $Ha$.
    Let's re-read carefully: $a \sim b$ if $b^{-1}a \in H$.
    Reflexive: $a^{-1}a = e \in H$. So $a \sim a$.
    Symmetric: If $a \sim b$, then $b^{-1}a \in H$. So $(b^{-1}a)^{-1} \in H$. This is $a^{-1}(b^{-1})^{-1} = a^{-1}b \in H$. So $b \sim a$.
    Transitive: If $a \sim b$ and $b \sim c$. Then $b^{-1}a \in H$ and $c^{-1}b \in H$. Then $(c^{-1}b)(b^{-1}a) = c^{-1}a \in H$. So $a \sim c$.
    Yes, it's an equivalence relation. The equivalence class of $a$ is $\{x \in G \mid x \sim a \} = \{x \in G \mid a^{-1}x \in H \}$. Let $a^{-1}x = h \in H$. Then $x = ah$. So the class is $aH$.

78. (a) Prove that the relation 'x is conjugate to y' (i.e., $x = gyg^{-1}$ for some $g \in G$) in a group G is an equivalence relation on G. (b) Describe the elements a whose conjugacy class (the equivalence class containing a) consists of the element a alone. (These are the elements of the center Z(G)).

79. Let R be a relation on the set $\mathbb{R}$ of real numbers. We may view R as a subset of the (x,y)-plane. Explain the geometric meaning of the reflexive property and the symmetric property for R.

80. With each of the following subsets R of the (x,y)-plane, determine which of the axioms for an equivalence relation (reflexivity, symmetry, transitivity) are satisfied on the set $\mathbb{R}$ of real numbers.
    (a) $R = \{(s,s) \mid s \in \mathbb{R}\}$.
    (b) $R = \emptyset$ (the empty set).
    (c) $R = \{(x,y) \mid y = 0\}$.
    (d) $R = \{(x,y) \mid xy + 1 = 0\}$.
    (e) $R = \{(x,y) \mid x^2y - xy^2 - x + y = 0\}$. (Factorizes to $(xy-1)(x-y)=0$)
    (f) $R = \{(x,y) \mid x^2 - xy + 2x - 2y = 0\}$. (Factorizes to $(x-y)(x+2)=0$)

81. Describe the smallest equivalence relation on the set of real numbers $\mathbb{R}$ that contains the line $y = x+1$ in the (x,y)-plane. Sketch this equivalence relation as a subset of $\mathbb{R}^2$.

82. Consider the map $f: \mathbb{R}^2 \to \mathbb{R}$ defined by $f(x,z) = y = zx$. Draw the fibres of this map (level sets for y) in the (x,z)-plane for $y=0, y=1, y=-1$.

83. Work out the rules for addition and multiplication on the set $\{\bar{0}, \bar{1}\}$ (representing even and odd integers, as in text equation (5.8)) that are induced from addition and multiplication of integers. Verify that these operations are well-defined.

84. Prove that the cosets $aN$ of $N = \ker \phi$ (as in text equation (5.14)) are precisely the fibres of the homomorphism $\phi: G \to G'$.

85. Determine the index $[\mathbb{Z} : n\mathbb{Z}]$, where $n\mathbb{Z}$ is the subgroup of multiples of a positive integer n.

86. Prove directly from the definition of cosets $aH$ and $bH$ that if $aH \ne bH$, then $aH \cap bH = \emptyset$.

87. Prove Cauchy's Theorem for Abelian Groups: If G is a finite abelian group and p is a prime dividing the order of G, then G contains an element of order p. (The original problem states "power of a prime p", which is Sylow's first theorem, harder. The text version is "order p", which is Cauchy's Theorem). The original problem states: "Prove that every group whose order is a power of a prime p contains an element of order p." This is true, and is a consequence of Cauchy's Theorem if $|G|=p^k, k \ge 1$. If $k=1$, G is cyclic of order p.

88. Give an example showing that left cosets and right cosets of $H=GL_2(\mathbb{R})$ in $G=GL_2(\mathbb{C})$ are not always equal. (Hint: Find a matrix $M \in GL_2(\mathbb{C})$ such that $MH \ne HM$).

89. Let H and K be subgroups of a finite group G. If $|H|=3$ and $|K|=5$, and G is finite, prove that $H \cap K = \{1\}$. (Hint: Lagrange's Theorem).

90. Justify carefully the formula $|G| = |\ker \phi| |\text{im } \phi|$ (text equation (6.15)) for a homomorphism $\phi: G \to G'$ where G is a finite group.

91. (a) Let G be an abelian group of odd order. Prove that the map $\phi: G \to G$ defined by $\phi(x) = x^2$ is an automorphism. (b) Generalize the result of (a): If G is a finite abelian group and n is an integer relatively prime to |G|, prove that $\phi_n(x) = x^n$ is an automorphism.

92. Let W be the additive subgroup of $\mathbb{R}^m$ consisting of solutions to a system of homogeneous linear equations $AX = 0$. Show that the set of solutions to an inhomogeneous system $AX = B$ (where $B \ne 0$), if non-empty, forms a coset of W.

93. Let H be a subgroup of a group G.
    (a) If G is finite, prove that the number of left cosets of H in G is equal to the number of right cosets of H in G.
    (b) Prove this result for any group G (finite or infinite) by constructing a bijection between the set of left cosets and the set of right cosets. (Hint: consider the map $aH \mapsto Ha^{-1}$).

94. (a) Prove that every subgroup of index 2 in a group G is normal in G. (b) Give an example of a group G and a subgroup H such that $[G:H]=3$ and H is not normal in G. ($S_3$ and $H=\langle (12) \rangle$ is an example).

95. Classify groups of order 6 up to isomorphism by analyzing the following cases:
    (a) G contains an element of order 6.
    (b) G contains an element of order 3 but no element of order 6. (This implies G also has an element of order 2).
    (c) All elements of G (other than identity) have order 2 or 3, but none of order 6.
    *(This problem actually hints towards $\mathbb{Z}_6$ and $S_3$. Case (c) is redundant if (b) is analyzed fully)*.

96. Let $G = \left\{ \begin{pmatrix} x & y \\ 0 & 1 \end{pmatrix} \mid x, y \in \mathbb{R}, x \ne 0 \right\}$ and $H = \left\{ \begin{pmatrix} x & 0 \\ 0 & 1 \end{pmatrix} \mid x \in \mathbb{R}, x > 0 \right\}$.
    (a) Verify G is a group and H is a subgroup.
    (b) An element of G can be represented by a point $(x,y)$ in the plane (where $x \ne 0$). Describe and draw the partition of the relevant part of the plane into left cosets of H.
    (c) Describe and draw the partition into right cosets of H. Are they the same? Is H normal?

97. Let G and G' be finite groups such that their orders, |G| and |G'|, are relatively prime. Prove that the only homomorphism $\phi: G \to G'$ is the trivial homomorphism (i.e., $\phi(x) = 1_{G'}$ for all $x \in G$).

98. (a) Give an example of a permutation in $S_4$ of even order that is an odd permutation.
    (b) Give an example of a permutation in $S_4$ of even order that is an even permutation.

99. (a) Let H and K be subgroups of a group G. Prove that the intersection $xH \cap yK$ of two left cosets $xH$ and $yK$ is either empty or else is a left coset of the subgroup $H \cap K$. (b) Prove that if H and K have finite index in G, then $H \cap K$ also has finite index in G. (Hint: Consider $G/(H \cap K)$ mapping to $G/H \times G/K$).

100. Prove Proposition (7.1) from the text: (a) The intersection $K \cap H$ of two subgroups K and H of G is a subgroup of G. (b) If K is a normal subgroup of G, then $K \cap H$ is a normal subgroup of H (but not necessarily of G).

101. Let H and N be subgroups of a group G, with N normal in G. Prove that $HN = \{hn \mid h \in H, n \in N\}$ is a subgroup of G. Also show $HN=NH$.

102. Let $\phi: G \to G'$ be a group homomorphism with kernel K. Let H be a subgroup of G. Describe the preimage $\phi^{-1}(\phi(H))$ in terms of H and K. (Show it is HK = KH).

103. Prove that a group of order 30 can have at most 7 distinct subgroups of order 5. (Hint: If it had 8, how many elements of order 5 would there be?) The number of subgroups of order p (prime) is $n_p \equiv 1 \pmod p$ and $n_p$ divides $|G|/p$. For order 5, $n_5 \equiv 1 \pmod 5$ and $n_5 | 6$. So $n_5$ can be 1 or 6. The question asks for *at most 7*. Is there a typo in the question (e.g. order 3)? Or is there a subtler point for "at most 7"? If $n_5=1$, 1 subgroup. If $n_5=6$, 6 subgroups. Both are $\le 7$. Perhaps the question is simpler: "If $N_5$ is the number of subgroups of order 5, then $N_5 \le 7$." This is true since $N_5$ can be 1 or 6.

104. *Prove the Correspondence Theorem (also known as the Lattice Isomorphism Theorem or Fourth Isomorphism Theorem): Let $\phi: G \to G'$ be a surjective group homomorphism with kernel N. Then there is a bijective correspondence between the set of subgroups H of G that contain N and the set of subgroups H' of G'. This correspondence is given by $H \mapsto \phi(H)$ and $H' \mapsto \phi^{-1}(H')$. Furthermore, under this correspondence, normal subgroups of G (containing N) correspond to normal subgroups of G'.

105. Let G be the cyclic group of order 12 generated by an element x, so $G = \langle x \rangle$. Let G' be the cyclic group of order 6 generated by an element y, so $G' = \langle y \rangle$. Consider the homomorphism $\phi: G \to G'$ defined by $\phi(x) = y$.
    (a) Find the kernel N of $\phi$.
    (b) List all subgroups of G that contain N.
    (c) List all subgroups of G'.
    (d) Explicitly show the bijective correspondence described in the Correspondence Theorem (Problem 104) for this example.

106. Let G and G' be groups. What is the order of the product group $G \times G'$ if G and G' are finite? If either is infinite?

107. Is the symmetric group $S_3$ isomorphic to a direct product of two non-trivial groups? Justify your answer. (Hint: Consider orders of possible factor groups).

108. Prove that a finite cyclic group of order rs is isomorphic to the product of cyclic groups $C_r \times C_s$ if and only if r and s are relatively prime (i.e., gcd(r,s) = 1).

109. In each of the following cases, determine whether or not G is isomorphic to the product of H and K. Justify your answers.
    (a) $G = \mathbb{R}^\times$ (non-zero reals under multiplication), $H = \{\pm 1\}$, $K = P$ (positive real numbers under multiplication).
    (b) $G = U_2(\mathbb{R})$ (invertible $2 \times 2$ real upper triangular matrices), $H = D_2(\mathbb{R})$ (invertible $2 \times 2$ real diagonal matrices), $K = N_2(\mathbb{R})$ ( $2 \times 2$ real upper triangular matrices with 1s on the diagonal - unipotent).
    (c) $G = \mathbb{C}^\times$ (non-zero complex numbers under multiplication), $H = U(1)$ (the unit circle, complex numbers of modulus 1), $K = P$ (positive real numbers under multiplication).

110. Prove that the product of two infinite cyclic groups (e.g., $\mathbb{Z} \times \mathbb{Z}$) is not an infinite cyclic group.

111. Prove that $Z(G \times G') = Z(G) \times Z(G')$, where Z denotes the center of a group.

112. (a) Let H and K be subgroups of a group G. Show that the set of products $HK = \{hk \mid h \in H, k \in K\}$ is a subgroup of G if and only if $HK = KH$. (b) Give an example of a group G and two subgroups H, K such that HK is not a subgroup. (e.g. in $S_3$).

113. Let G be a group containing a normal subgroup H of order 3 and a normal subgroup K of order 5. Prove that G contains an element of order 15. (Hint: Consider $H \cap K$ and $HK$).

114. Let G be a finite group of order $n = ab$, where a and b are positive integers. Let H be a subgroup of G of order a, and K be a subgroup of G of order b. Assume that $H \cap K = \{1\}$.
    (a) Prove that $|HK| = |H||K| = ab$, which implies $HK = G$.
    (b) If, in addition, H and K are normal subgroups of G, prove that G is isomorphic to the product group $H \times K$.
    (c) Does the conclusion of (b) hold if only one of H or K is normal?

115. Let $(g, g') \in G \times G'$. If $g$ has order m in G and $g'$ has order n in G', what is the order of $(g, g')$ in $G \times G'$? Prove your statement.

116. Let H be a subgroup of a group G. Suppose there is a homomorphism $\phi: G \to H$ such that $\phi(h) = h$ for all $h \in H$ (i.e., $\phi$ is a retraction onto H). Let $N = \ker \phi$.
    (a) Prove that if G is abelian, then G is isomorphic to the product group $H \times N$.
    (b) Find a bijective map $f: G \to H \times N$ (as sets) without the assumption that G is abelian. Show by an example (e.g., $G=S_3, H=\langle (12) \rangle$, this doesn't fit retraction criteria. Need a group $G$ that is a semidirect product $H \ltimes N$ but not a direct product) that G need not be isomorphic to $H \times N$ if G is not abelian. (A better example: $G = D_3 \cong S_3$, $H = \langle (123) \rangle \cong C_3$, $N = \langle (12) \rangle \cong C_2$. Here $S_3$ is not $C_3 \times C_2$. For a retraction, let $G=S_3$, $H=A_3$. $\phi: S_3 \to A_3$ defined by $\phi(\sigma)=\sigma$ if $\sigma \in A_3$ and $\phi(\sigma (12)) = \sigma$ if $\sigma (12) \notin A_3$. This is not well-defined. The standard context for this is $G=H \ltimes N$, where $N$ is normal, $H \cap N = \{e\}$, $HN=G$. The map $\phi: HN \to H$ by $hn \mapsto h$ is a homomorphism if $N$ is normal *and* $H$ normalizes $N$ in a specific way for $\phi$ to be a homomorphism. If $G=H \times N$, then $\phi((h,n)) = (h,e_N) \cong H$ is a retraction. Then $ker \phi = \{e_H\} \times N \cong N$. So $G \cong H \times ker \phi$).

117. Compute $(7 + 14)(3 - 16)$ modulo 17.

118. (a) Prove that for any integer a, $a^2 \equiv 0 \pmod 4$ or $a^2 \equiv 1 \pmod 4$. (b) What are the possible values of $a^2$ modulo 8?

119. (a) Prove that 2 has no multiplicative inverse modulo 6. (b) Determine for which positive integers n the integer 2 has a multiplicative inverse modulo n.

120. Prove that every integer a is congruent to the sum of its decimal digits modulo 9. (E.g., $123 \equiv 1+2+3 \equiv 6 \pmod 9$).

121. Solve the linear congruence $2x \equiv 5$ (a) modulo 9 and (b) modulo 6 (if solutions exist).

122. Determine the integers n for which the system of congruences $x + y \equiv 2 \pmod{n}$ and $2x - 3y \equiv 3 \pmod{n}$ has a unique solution modulo n.

123. Prove the associative and commutative laws for multiplication in $\mathbb{Z}/n\mathbb{Z}$ directly from the definition of multiplication of congruence classes.

124. Use Proposition (2.6) from the text ($d = ar+bs$ for $d=gcd(a,b)$) to prove the Chinese Remainder Theorem: Let m, n be positive integers with gcd(m,n) = 1. Then for any integers a, b, there exists an integer x such that $x \equiv a \pmod{m}$ and $x \equiv b \pmod{n}$. Furthermore, this solution x is unique modulo mn.

125. Let G be the group of invertible real upper triangular $2 \times 2$ matrices, $G = \left\{ \begin{pmatrix} a & b \\ 0 & d \end{pmatrix} \mid ad \ne 0 \right\}$. Determine whether or not the following conditions on matrices in G describe normal subgroups H of G. If they do, use the First Isomorphism Theorem to identify the quotient group G/H.
    (a) $a = 1$. (Let $H_a = \{M \in G \mid a=1\}$).
    (b) $b = 0$. (Let $H_b = \{M \in G \mid b=0\}$). (This is the subgroup of diagonal matrices).
    (c) $a = d$. (Let $H_c = \{M \in G \mid a=d\}$).
    (d) $a = d = 1$. (Let $H_d = \{M \in G \mid a=d=1\}$). (This is the subgroup of unipotent matrices $\begin{pmatrix} 1 & b \\ 0 & 1 \end{pmatrix}$).

126. Write out the proof of Lemma (10.1) (i.e., $(aN)(bN) = abN$ for N normal) by showing set equality: first show $(aN)(bN) \subseteq abN$, then $abN \subseteq (aN)(bN)$.

127. Let P be a partition of a group G with the property that for any pair of sets A, B in P, the product set $AB = \{ab \mid a \in A, b \in B\}$ is entirely contained within some set C in P (i.e., $AB \subseteq C$ for some $C \in P$). Let N be the set in P that contains the identity element $1_G$. Prove that N is a normal subgroup of G and that P is precisely the set of left (or right) cosets of N in G.

128. (a) Consider $G=S_3$ and $H = \langle (12) \rangle = \{e, (12)\}$. Compute the product sets $(eH)( (123)H )$ and $( (123)H )(eH)$. Are they equal? Is H normal? Verify that $(eH)( (123)H )$ is not a single coset of H.
    (b) A group of order 6 is isomorphic to $\mathbb{Z}_6$ or $S_3$. Show that $\mathbb{Z}_6$ can be described by generators x, y satisfying $x^3=e, y^2=e, yx=xy$. (Here $x$ corresponds to $(0,1)$ in $\mathbb{Z}_2 \times \mathbb{Z}_3$ and $y$ to $(1,0)$.)
    (c) Repeat the computation of (a) using the group $\mathbb{Z}_6$ described in (b), with $H = \langle y \rangle$. Is H normal in this case? Explain why the outcome is different from (a).

129. Identify the quotient group $\mathbb{R}^\times / P$, where $\mathbb{R}^\times$ is the group of non-zero real numbers under multiplication and P is the subgroup of positive real numbers.

130. Let $G = \mathbb{C}^\times$ (non-zero complex numbers under multiplication) and $H = \{\pm 1, \pm i\}$ be the subgroup of fourth roots of unity.
    (a) Describe the cosets of H in G explicitly (geometrically).
    (b) Prove that the quotient group $G/H$ is isomorphic to G itself. (Hint: Consider the map $z \mapsto z^4$).

131. Find all normal subgroups N of the quaternion group $Q_8 = \{\pm 1, \pm i, \pm j, \pm k\}$. For each normal subgroup, identify the structure of the quotient group $Q_8/N$.

132. Let $G = GL_n(\mathbb{R})$. Let $P = \{A \in G \mid \det(A) > 0\}$. Prove that P is a normal subgroup of G, and describe the quotient group $G/P$.

133. Let $G_1$ and $G_2$ be groups.
    (a) Prove that $N_1 = G_1 \times \{1_{G_2}\}$ is a normal subgroup of $G_1 \times G_2$.
    (b) Prove that $N_1$ is isomorphic to $G_1$.
    (c) Prove that $(G_1 \times G_2)/N_1$ is isomorphic to $G_2$.

134. (a) Describe the quotient group $\mathbb{C}^\times / P$, where $P = \{x \in \mathbb{R} \mid x > 0\}$ is the subgroup of positive reals. (Hint: map $z \mapsto z/|z|$).
    (b) Describe the quotient group $\mathbb{C}^\times / U(1)$, where $U(1) = \{z \in \mathbb{C} \mid |z|=1\}$ is the unit circle. (Hint: map $z \mapsto |z|$).

135. Prove that the additive group $\mathbb{R}/\mathbb{Z}$ is isomorphic to the multiplicative group $U(1) = \{z \in \mathbb{C} \mid |z|=1\}$. (The problem statement in OCR had $\mathbb{R}^+/\mathbb{Z}^+$ and $\mathbb{R}^+/2\pi\mathbb{Z}^+$, which is unusual notation. This is the standard interpretation.)

136. What is the product of all m-th roots of unity in $\mathbb{C}$? (Consider cases for m).

137. Compute the group of inner automorphisms, Inn(Q$_8$), of the quaternion group Q$_8$. Recall Inn(G) $\cong G/Z(G)$.

138. Prove that a group G of even order must contain at least one element of order 2. (Hint: Pair elements with their inverses).

139. Let $K \subseteq H \subseteq G$ be subgroups of a finite group G. Prove the "tower law" for indices: $[G:K] = [G:H][H:K]$.

140. *A semigroup S is a set with an associative law of composition and an identity element $1_S$. Elements are not required to have inverses. S is generated by an element $s \in S$ if $S = \{1_S, s, s^2, s^3, ...\}$.
    (a) Define "isomorphism of semigroups".
    (b) Describe all isomorphism classes of semigroups that have a single generator s, by considering different possibilities for relations like $s^k = s^m$. (E.g. $s^2=1_S$, $s^2=s$, $s^k=1_S$ for minimal $k>0$, or all $s^k$ distinct).

141. Let S be a semigroup with a finite number of elements which also satisfies the left and right cancellation laws (i.e., if $ax=ay$ then $x=y$, and if $xa=ya$ then $x=y$). Prove that S must be a group.

142. *Let $S \subseteq \mathbb{R}^k$. A path in S from point $a \in S$ to point $b \in S$ is a continuous function $f: [0,1] \to S$ such that $f(0)=a$ and $f(1)=b$. Define $a \sim b$ if such a path exists.
    (a) Show that $\sim$ is an equivalence relation on S.
    (b) The equivalence classes are called path components. Show S is partitioned by its path components.
    (c) For $S_1 = \{(x,y) \in \mathbb{R}^2 \mid x^2+y^2=1\}$, $S_2 = \{(x,y) \in \mathbb{R}^2 \mid xy=0\}$, $S_3 = \{(x,y) \in \mathbb{R}^2 \mid xy=1\}$, determine if each is path-connected. If not, how many path components does each have?

143. *Let G be a subgroup of $GL_n(\mathbb{R})$. Let $G_0$ be the set of matrices in G that can be path-connected to the identity matrix I by a path lying entirely within G.
    (a) Prove that if $A, B \in G_0$ and $C, D \in G_0$, and paths connect A to B and C to D within $G_0$, then it doesn't directly imply a path for AC to BD using those paths. However, prove that $G_0$ is a subgroup of G. (Hint: If $A(t)$ is a path from I to A, and $B(t)$ is a path from I to B, consider $A(t)B(t)$ or $A(t)B$ or $A B(t)$.)
    (b) Prove that $G_0$ is a normal subgroup of G. ($G_0$ is the "connected component of the identity").

144. *(a) It is known that $SL_n(\mathbb{R})$ is generated by elementary matrices of the form $E_{ij}(c)$ (add c times row j to row i). Each $E_{ij}(c)$ can be path-connected to I (e.g., $E_{ij}(tc)$ for $t \in [0,1]$). Use this to argue that $SL_n(\mathbb{R})$ is path-connected.
    (b) Show that $GL_n(\mathbb{R})$ is a union of two disjoint path-connected subsets. Describe these subsets (based on determinant).

145. Let H and K be subgroups of a group G, and let $g \in G$. The set $HgK = \{hgk \mid h \in H, k \in K\}$ is called a double coset.
    (a) Prove that the set of all distinct double cosets $HgK$ partitions G.
    (b) Do all double cosets necessarily have the same number of elements? If not, provide a counterexample.

146. Let H be a subgroup of a group G.
    (a) Show that the double coset $HgH$ is a union of left cosets of H.
    (b) Show that $HgH = gH$ if and only if $gHg^{-1} = H$ (i.e., $g$ is in the normalizer of H).
    (c) Conclude that if H is normal in G, then every double coset $HgH$ is simply the left coset $gH$ (which is also $Hg$).
    (d) If H is not normal, show there exists some $g \in G$ such that the double coset $HgH$ properly contains the left coset $gH$.

147. *Consider $G = GL_n(\mathbb{R})$, $H = L_n(\mathbb{R})$ (invertible lower triangular matrices), and $K = U_n(\mathbb{R})$ (invertible upper triangular matrices). The Bruhat decomposition states that $G = \bigcup_{w \in S_n} H P_w K$, where $P_w$ is the permutation matrix corresponding to $w \in S_n$, and this union is disjoint. These $HP_wK$ are the double cosets. What is the double coset $HP_e K$ where $e$ is the identity permutation? (This is $B=H \cap K$, the diagonal matrices, or simply $HK$ if $P_e=I$). This requires more background than the chapter provides but is related to double cosets. The text's problem was "Prove that the double cosets in $GL_n(\mathbb{R})$ of the subgroups H={lower triangular matrices} and K={upper triangular matrices} are the sets $HP_wK$, where $P_w$ is a permutation matrix." This is the Bruhat decomposition.

148. Define what a binary operation on a set S is. Give an example of a set and an operation that is a binary operation, and one that is not.

149. If $*$ is an associative binary operation on a set S, and S has an identity element $e$ for $*$, prove that the identity element is unique.

150. If G is a group and $a \in G$, prove that the inverse $a^{-1}$ is unique.

151. Consider the set of integers $\mathbb{Z}$ with the operation $a * b = a + b + 1$.
    (a) Is $*$ associative?
    (b) Is there an identity element for $*$? If so, what is it?
    (c) If there is an identity, which elements have inverses?
    (d) Is $(\mathbb{Z}, *)$ a group?

152. Prove that if $g^2 = e$ for all $g$ in a group G (where e is the identity), then G must be abelian.

153. Let G be a group. Prove that $(a^{-1})^{-1} = a$ for all $a \in G$.

154. Let $H = \{A \in GL_2(\mathbb{R}) \mid \det(A) \text{ is an integer}\}$. Is H a subgroup of $GL_2(\mathbb{R})$? Justify your answer.

155. Find the order of each element in the group $\mathbb{Z}_6$ (integers modulo 6 under addition). Is $\mathbb{Z}_6$ cyclic?

156. List all subgroups of $\mathbb{Z}_6$. Which ones are normal?

157. Consider the group $S_3$. Let $H = \langle (123) \rangle$. List the left cosets of H in $S_3$. What is the index $[S_3:H]$?

158. Prove that if $\phi: G \to G'$ is a group homomorphism, then $\phi(a^n) = (\phi(a))^n$ for any integer $n$.

159. Let $\phi: \mathbb{Z} \to \mathbb{Z}_n$ be given by $\phi(k) = \bar{k}$ (k mod n). Prove this is a surjective homomorphism and find its kernel. Apply the First Isomorphism Theorem.

160. Can a group of order 20 have a subgroup of order 7? Explain using Lagrange's Theorem.

161. Let G be a group and $N \trianglelefteq G$ (N is a normal subgroup of G). Prove that the map $\pi: G \to G/N$ defined by $\pi(g) = gN$ is a surjective group homomorphism with kernel N.

162. Show that $A_n$ (the alternating group on n symbols) is a normal subgroup of $S_n$. What is the order of the quotient group $S_n/A_n$?

163. If H and K are normal subgroups of G, prove that $H \cap K$ is also a normal subgroup of G.

164. Consider the group $(\mathbb{Q}, +)$ of rational numbers under addition. Is this group cyclic? Justify your answer.

165. Let $G = \mathbb{R}^\times$ and $H = \{x \in \mathbb{R}^\times \mid x^2 \in \mathbb{Q}\}$. Is H a subgroup of G?

166. If G is a group such that $(ab)^2 = a^2b^2$ for all $a, b \in G$, prove that G is abelian.

167. Let $\phi: G \to H$ be an isomorphism. If K is a normal subgroup of G, prove $\phi(K)$ is a normal subgroup of H.

168. Find all distinct left cosets of the subgroup $H = \{ (0,0), (0,1) \}$ in the group $G = \mathbb{Z}_2 \times \mathbb{Z}_2$. Write down the Cayley table for $G/H$.

169. Let $G$ be a group of order $p^2$ where p is a prime number. Prove that G must have a subgroup of order p. (This is a consequence of Cauchy's theorem or Sylow theorems, but can be proven by considering if G is cyclic or not).

170. Let $SL_2(\mathbb{Z}_3)$ be the group of $2 \times 2$ matrices with entries from $\mathbb{Z}_3$ and determinant 1.
    (a) How many elements does $GL_2(\mathbb{Z}_3)$ have?
    (b) How many elements does $SL_2(\mathbb{Z}_3)$ have? (Hint: consider det as a homomorphism).

171. Prove that if N is a normal subgroup of G and H is any subgroup of G, then $N \cap H$ is a normal subgroup of H.

172. Let $\mathbb{R}^*$ be the group of non-zero real numbers under multiplication. Define $\phi: \mathbb{R}^* \to \mathbb{R}^*$ by $\phi(x) = x^2$.
    (a) Show that $\phi$ is a homomorphism.
    (b) Find $\ker(\phi)$ and $\text{im}(\phi)$.
    (c) Is $\mathbb{R}^*/\ker(\phi) \cong \text{im}(\phi)$?

173. Let G be any group. Show that the map $g \mapsto \phi_g$ where $\phi_g(x) = gxg^{-1}$ is a homomorphism from G to Aut(G). What is the kernel of this homomorphism?

174. If H is a subgroup of G, the normalizer of H in G is $N_G(H) = \{g \in G \mid gHg^{-1} = H\}$. Prove that $N_G(H)$ is the largest subgroup of G in which H is normal.

175. Prove that a group of order 35 is cyclic. (Hint: Use Sylow theorems or counting arguments related to orders of elements). More elementarily: Show if $n_5=1$ and $n_7=1$, then $G \cong C_5 \times C_7 \cong C_{35}$.

176. For any $a \in G$, show that the set $C(a) = \{g \in G \mid ga=ag\}$ (the centralizer of a) is a subgroup of G. Is it always normal?

177. If G/Z(G) is cyclic, prove that G is abelian (which implies G/Z(G) is trivial).

178. Give an example of a non-abelian group G such that all its proper subgroups are abelian. (e.g. $S_3$ or $Q_8$).

179. Let $G = \mathbb{Z}_{10} \times \mathbb{Z}_{12}$. Find the order of the element $(2,3)$ in G.

180. How many distinct subgroups of order 2 does the Klein four group $V_4$ have?

181. Let $\phi: G \to H$ be a homomorphism. If $G$ is finite, prove that $|\phi(G)|$ divides $|G|$.

182. Let $G = \mathbb{Z}_{4}$. Let $\phi: G \to G$ be defined by $\phi(x) = 2x$.
    (a) Verify $\phi$ is a homomorphism.
    (b) Find $\ker(\phi)$ and $\text{im}(\phi)$.
    (c) What does the First Isomorphism Theorem say in this case?

183. Prove that the intersection of any collection of normal subgroups of G is a normal subgroup of G.

184. Consider the dihedral group $D_4$ of order 8 (symmetries of a square). Let r be a rotation by $90^\circ$ and s be a reflection.
    (a) What is the center $Z(D_4)$?
    (b) Find a normal subgroup N of $D_4$ of order 4.
    (c) What is the structure of $D_4/N$?

185. If $H \trianglelefteq G$ and $K \trianglelefteq G$, and $H \cap K = \{e\}$, prove that $hk=kh$ for all $h \in H, k \in K$. (Hint: consider $hkh^{-1}k^{-1}$).

186. Let G be a group. An element $x \in G$ is a commutator if $x = aba^{-1}b^{-1}$ for some $a,b \in G$. The subgroup generated by all commutators is called the commutator subgroup $G'$. Prove that $G'$ is a normal subgroup of G and that $G/G'$ is abelian.

187. If $G$ is a simple group (has no non-trivial proper normal subgroups), what can you say about any homomorphism $\phi: G \to H$ where H is some other group?

188. Let $G = \mathbb{Q}$ (rational numbers under addition). Let $N=\mathbb{Z}$ (integers). Describe the elements of the quotient group $\mathbb{Q}/\mathbb{Z}$. Can every element be written as $q+\mathbb{Z}$ where $0 \le q < 1$?

189. Prove that if $M$ and $N$ are normal subgroups of a group $G$ such that $G=MN$ and $M \cap N = \{e\}$, then $G \cong M \times N$.

190. Suppose a group G has exactly one non-trivial proper subgroup H. What can be said about the order of G if G is finite? (Hint: H must be normal. Consider G/H).

# Chapter 3: VECTOR SPACES

1.  Which of the following subsets of the vector space of real $n \times n$ matrices is a subspace?
    (a) symmetric matrices ($A = A^t$)
    (b) invertible matrices
    (c) upper triangular matrices

2.  Prove that the intersection of two subspaces is a subspace.

3.  Prove the cancellation law in a vector space: If $cv = cw$ and $c \ne 0$, then $v = w$.

4.  Prove that if $w$ is an element of a subspace $W$, then $-w \in W$ too.

5.  Prove that the classification of subspaces of $\mathbb{R}^3$ stated after (1.2) is complete. (The text states these are: (i) the zero vector, (ii) lines through the origin, (iii) planes through the origin, (iv) $\mathbb{R}^3$ itself).

6.  Prove that every solution of the equation $2x_1 - x_2 - 2x_3 = 0$ has the form (1.5). (Equation (1.5) is $c_1w_1 + c_2w_2 = \begin{pmatrix} c_1+c_2 \\ 2c_2 \\ c_1 \end{pmatrix}$, where $w_1 = \begin{pmatrix} 1 \\ 0 \\ 1 \end{pmatrix}, w_2 = \begin{pmatrix} 1 \\ 2 \\ 0 \end{pmatrix}$).

7.  What is the description analogous to (1.4) obtained from the particular solutions $u_1 = (2, 2, 1)$ and $u_2 = (0, 2, -1)$? (Equation (1.4) gives $w_1, w_2$ for $2x_1 - x_2 - 2x_3 = 0$).

8.  Prove that the set of numbers of the form $a + b\sqrt{2}$, where $a, b$ are rational numbers, is a field.

9.  Which subsets of $\mathbb{C}$ are closed under +, -, $\times$, and $\div$ but fail to contain 1?

10. Let F be a subset of $\mathbb{C}$ such that $F^+$ is a subgroup of $\mathbb{C}^+$ and $F^\times$ is a subgroup of $\mathbb{C}^\times$. Prove that F is a subfield of $\mathbb{C}$.

11. Let $V = \mathbb{F}^n$ be the space of column vectors. Prove that every subspace W of V is the space of solutions of some system of homogeneous linear equations $AX = 0$.

12. Prove that a nonempty subset W of a vector space satisfies the conditions (2.12) for a subspace if and only if it is closed under addition and scalar multiplication. (Conditions (2.12) are (a) If $w, w' \in W$, then $w+w' \in W$. (b) If $w \in W$ and $c \in F$, then $cw \in W$. (c) $0 \in W$.)

13. Show that in Definition (2.3), axiom (ii) can be replaced by the following axiom: $F^\times$ is an abelian group, and $1 \ne 0$. What if the condition $1 \ne 0$ is omitted? (Definition (2.3) axiom (ii) is: Multiplication is associative and commutative and makes $F^\times = F - \{0\}$ into a group. Its identity element is denoted by 1.)

14. Define homomorphism of fields, and prove that every homomorphism of fields is injective.

15. Find the inverse of $\bar{5}$ (modulo p) for $p = 2, 3, 7, 11, 13$.

16. Compute the polynomial $(x^2 + 3x + 1)(x^3 + 4x^2 + 2x + 2)$ when the coefficients are regarded as elements of the fields (a) $\mathbb{F}_5$ (b) $\mathbb{F}_7$.

17. Consider the system of linear equations:
    $$ \begin{pmatrix} 8 & 3 \\ 2 & 6 \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \end{pmatrix} = \begin{pmatrix} 3 \\ -1 \end{pmatrix} $$
    (a) Solve it in $\mathbb{F}_p$ when $p = 5, 11, 17$.
    (b) Determine the number of solutions when $p = 7$.

18. Find all primes p such that the matrix
    $$ A = \begin{pmatrix} 1 & 2 & 0 \\ 0 & 3 & -1 \\ -2 & 0 & 2 \end{pmatrix} $$
    is invertible, when its entries are considered to be in $\mathbb{F}_p$.

19. Solve completely the systems of linear equations $AX = B$, where
    $$ A = \begin{pmatrix} 1 & 1 & 0 \\ 1 & 0 & 1 \\ 1 & -1 & -1 \end{pmatrix}, B = \begin{pmatrix} 0 \\ 0 \\ 0 \end{pmatrix} \quad \text{and} \quad B = \begin{pmatrix} 1 \\ -1 \\ 1 \end{pmatrix} $$
    (a) in $\mathbb{Q}$ (b) in $\mathbb{F}_2$ (c) in $\mathbb{F}_3$ (d) in $\mathbb{F}_7$.

20. Let p be a prime integer. The nonzero elements of $\mathbb{F}_p$ form a group $\mathbb{F}_p^\times$ of order $p-1$. It is a fact that this group is always cyclic. Verify this for all primes $p < 20$ by exhibiting a generator.

21. (a) Let p be a prime. Use the fact that $\mathbb{F}_p^\times$ is a group to prove that $a^{p-1} \equiv 1 \pmod p$ for every integer $a$ not congruent to zero.
    (b) Prove Fermat's Theorem: For every integer $a$, $a^p \equiv a \pmod p$.

22. (a) By pairing elements with their inverses, prove that the product of all nonzero elements of $\mathbb{F}_p$ is -1.
    (b) Let p be a prime integer. Prove Wilson's Theorem: $(p-1)! \equiv -1 \pmod p$.

23. Consider a system $AX = B$ of n linear equations in n unknowns, where A and B have integer entries. Prove or disprove: If the system has an integer solution, then it has a solution in $\mathbb{F}_p$ for all p.

24. Interpreting matrix entries in the field $\mathbb{F}_2$, prove that the four matrices $\begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 1 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix}$ do not form a field under standard matrix addition and multiplication. (The problem in the text asks to prove specific matrices $\begin{pmatrix} 1 & 1 \\ 1 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 1 \\ 1 & 1 \end{pmatrix}, \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} 0 & 0 \\ 0 & 0 \end{pmatrix}$ form a field. The question here is modified as the standard basis matrices for $M_{2 \times 2}$ clearly don't form a field under matrix multiplication).
    Prove that the matrices $\begin{pmatrix} 0 & 0 \\ 0 & 0 \end{pmatrix}, \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} 1 & 1 \\ 1 & 0 \end{pmatrix}, \begin{pmatrix} 0 & 1 \\ 1 & 1 \end{pmatrix}$ in $\mathbb{F}_2$ form a field of 4 elements.

25. The proof of Lemma (2.8) contains a more direct proof of (2.6). Extract it. (Lemma 2.8: If prime p divides ab, then p divides a or p divides b. Proposition 2.6: If p is prime and a is not divisible by p, then there is an integer b such that $ab \equiv 1 \pmod p$).

26. Find a basis for the subspace of $\mathbb{R}^4$ spanned by the vectors $(1, 2, -1, 0)$, $(4, 8, -4, -3)$, $(0, 1, 3, 4)$, $(2, 5, 1, 4)$.

27. Let $W \subset \mathbb{R}^4$ be the space of solutions of the system of linear equations $AX = 0$, where
    $$ A = \begin{pmatrix} 2 & 1 & 2 & 3 \\ 1 & 1 & 3 & 0 \end{pmatrix} $$
    Find a basis for W.

28. (a) Show that a subset of a linearly independent set is linearly independent.
    (b) Show that any reordering of a basis is also a basis.

29. Let V be a vector space of dimension n over F, and let $0 \le r \le n$. Prove that V contains a subspace of dimension r.

30. Find a basis for the space of symmetric $n \times n$ matrices.

31. Prove that a square matrix A is invertible if and only if its columns are linearly independent.

32. Let V be the vector space of functions on the interval $[0, 1]$. Prove that the functions $x^3$, $\sin x$, and $\cos x$ are linearly independent.

33. Let A be an $m \times n$ matrix, and let A' be the result of a sequence of elementary row operations on A. Prove that the rows of A span the same subspace as the rows of A'.

34. Let V be a complex vector space of dimension n. Prove that V has dimension 2n as real vector space.

35. A complex $n \times n$ matrix is called hermitian if $a_{ij} = \overline{a_{ji}}$ for all i, j. Show that the hermitian matrices form a real vector space, find a basis for that space, and determine its dimension.

36. How many elements are there in the vector space $\mathbb{F}_p^n$?

37. Let $F = \mathbb{F}_2$. Find all bases of $F^2$.

38. Let $F = \mathbb{F}_3$. How many subspaces of each dimension does the space $F^3$ contain?

39. (a) Let V be a vector space of dimension 3 over the field $\mathbb{F}_p$. How many subspaces of each dimension does V have?
    (b) Answer the same question for a vector space of dimension 4.

40. (a) Let $F = \mathbb{F}_2$. Prove that the group $GL_2(F)$ is isomorphic to the symmetric group $S_3$.
    (b) Let $F = \mathbb{F}_3$. Determine the orders of $GL_2(F)$ and of $SL_2(F)$.

41. Let W be a subspace of V.
    (a) Prove that there is a subspace U of V such that $U + W = V$ and $U \cap W = \{0\}$.
    (b) Prove that there is no subspace U such that $W \cap U = \{0\}$ and $dim W + dim U > dim V$.

42. Compute the matrix P of change of basis in $\mathbb{F}^2$ relating the standard basis E to $B' = (v_1, v_2)$, where $v_1 = (1, 3)^t, v_2 = (2, 2)^t$.

43. Determine the matrix of change of basis, when the old basis is the standard basis $(e_1, ..., e_n)$ and the new basis is $(e_n, e_{n-1}, ..., e_1)$.

44. Determine the matrix P of change of basis when the old basis is $(e_1, e_2)$ and the new basis is $(e_1 + e_2, e_1 - e_2)$.

45. Consider the equilateral coordinate system for $\mathbb{R}^2$, given by the basis B' in which $v_1 = e_1$ and $v_2$ is a vector of unit length making an angle of $120^\circ$ with $v_1$. Find the matrix relating the standard basis E to B'.

46. (i) Prove that the set $B = ((1,2,0)^t, (2,1,2)^t, (3,1,1)^t)$ is a basis of $\mathbb{R}^3$.
    (ii) Find the coordinate vector of the vector $v = (1,2,3)^t$ with respect to this basis.
    (iii) Let $B' = ((0,1,0)^t, (1,0,1)^t, (2,1,0)^t)$. Find the matrix P relating B to B'.
    (iv) For which primes p is B a basis of $\mathbb{F}_p^3$?

47. Let B and B' be two bases of the vector space $\mathbb{F}^n$. Prove that the matrix of change of basis from B to B' (using text notation $B=B'P$) is $P = [B']^{-1}[B]$.

48. Let $B = (v_1, ..., v_n)$ be a basis of a vector space V. Prove that one can get from B to any other basis B' by a finite sequence of steps of the following types:
    (i) Replace $v_i$ by $v_i + av_j$, $i \ne j$, for some $a \in F$.
    (ii) Replace $v_i$ by $cv_i$ for some $c \ne 0$.
    (iii) Interchange $v_i$ and $v_j$.

49. Let $V = \mathbb{F}^n$. Establish a bijective correspondence between the sets $\mathcal{B}$ of bases of V and $GL_n(F)$.

50. Let F be a field containing 81 elements, and let V be a vector space of dimension 3 over F. Determine the number of one-dimensional subspaces of V.

51. Let $F = \mathbb{F}_p$.
    (a) Compute the order of $SL_2(F)$.
    (b) Compute the number of bases of $\mathbb{F}^n$, and the orders of $GL_n(F)$ and $SL_n(F)$.

52. (a) Let A be an $m \times n$ matrix with $m < n$. Prove that A has no left inverse by comparing A to the square $n \times n$ matrix obtained by adding $(n-m)$ rows of zeros at the bottom.
    (b) Let $B = (v_1, ..., v_m)$ and $B' = (v'_1, ..., v'_n)$ be two bases of a vector space V. Prove that $m=n$ by defining matrices of change of basis and showing that they are invertible.

53. Prove that the set $(w; e_1, e_2, ...)$ introduced in the text (Section 5, where $w=(1,1,1,...)$ and $e_i$ are standard basis vectors for sequences with finitely many non-zero terms) is linearly independent, and describe its span.

54. We could also consider the space of doubly infinite sequences $(a) = (..., a_{-1}, a_0, a_1, ...)$, with $a_i \in \mathbb{R}$. Prove that this space is isomorphic to $\mathbb{R}^\infty$.

55. Prove that the space Z (sequences with finitely many non-zero terms) is isomorphic to the space of real polynomials.

56. Describe five more infinite-dimensional subspaces of the space $\mathbb{R}^\infty$.

57. For every positive integer p, we can define the space $l^p$ to be the space of sequences such that $\sum |a_i|^p < \infty$.
    (a) Prove that $l^p$ is a subspace of $\mathbb{R}^\infty$.
    (b) Prove that $l^p \subset l^{p+1}$.

58. Let V be a vector space which is spanned by a countably infinite set. Prove that every linearly independent subset of V is finite or countably infinite.

59. Prove Proposition (5.7). (Prop 5.7: Let V be a finite-dimensional vector space. (a) Every set S which spans V contains a finite basis. (b) Every linearly independent set L is finite and therefore extends to a finite basis. (c) Every basis is finite.)

60. Prove that the space $\mathbb{R}^{n \times n}$ of all $n \times n$ real matrices is the direct sum of the spaces of symmetric matrices ($A=A^t$) and of skew-symmetric matrices ($A = -A^t$).

61. Let W be the space of $n \times n$ matrices whose trace is zero. Find a subspace W' so that $\mathbb{R}^{n \times n} = W \oplus W'$.

62. Prove that the sum of subspaces is a subspace.

63. Prove Proposition (6.5). (Prop 6.5: (a) A single subspace $W_1$ is independent. (b) Two subspaces $W_1, W_2$ are independent if and only if $W_1 \cap W_2 = \{0\}$.)

64. Prove Proposition (6.6). (Prop 6.6: Let $W_1, ..., W_n$ be subspaces of a finite-dimensional vector space V, and let $B_i$ be a basis for $W_i$. (a) The ordered set B obtained by listing the bases $B_1, ..., B_n$ in order is a basis of V if and only if $V = W_1 \oplus ... \oplus W_n$. (b) $dim(W_1 + ... + W_n) \le dim(W_1) + ... + dim(W_n)$, with equality if and only if the spaces are independent.)

65. (a) Prove that the set of symbols $\{a + bi \mid a, b \in \mathbb{F}_3\}$ forms a field with nine elements, if the laws of composition are made to mimic addition and multiplication of complex numbers (i.e., $i^2 = -1 \equiv 2 \pmod 3$).
    (b) Will the same method work for $\mathbb{F}_5$? For $\mathbb{F}_7$? Explain.

66. Let V be a vector space over an infinite field F. Prove that V is not the union of finitely many proper subspaces.

67. Let $W_1, W_2$ be subspaces of a vector space V. The formula $dim(W_1 + W_2) = dim W_1 + dim W_2 - dim(W_1 \cap W_2)$ is analogous to the formula $|S_1 \cup S_2| = |S_1| + |S_2| - |S_1 \cap S_2|$, which holds for sets. If three sets are given, then $|S_1 \cup S_2 \cup S_3| = |S_1| + |S_2| + |S_3| - |S_1 \cap S_2| - |S_1 \cap S_3| - |S_2 \cap S_3| + |S_1 \cap S_2 \cap S_3|$. Does the corresponding formula for dimensions of subspaces hold? (i.e. $dim(W_1+W_2+W_3) = \sum dim W_i - \sum dim(W_i \cap W_j) + dim(W_1 \cap W_2 \cap W_3)$?)

68. Let F be a field which is not of characteristic 2, and let $x^2 + bx + c = 0$ be a quadratic equation with coefficients in F. Assume that the discriminant $b^2 - 4c$ is a square in F, that is, that there is an element $\delta \in F$ such that $\delta^2 = b^2 - 4c$. Prove that the quadratic formula $x = (-b \pm \delta)/2$ solves the quadratic equation in F, and that if the discriminant is not a square the polynomial has no root in F. (Note: $1/2$ means the inverse of $1+1$).

69. (a) What are the orders of the elements $\begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}, \begin{pmatrix} 1 & 0 \\ 1 & 2 \end{pmatrix}$ of $GL_2(\mathbb{R})$?
    (b) Interpret the entries of these matrices as elements of $\mathbb{F}_7$, and compute their orders in the group $GL_2(\mathbb{F}_7)$.

70. Consider the function $det: F^{n \times n} \to F$, where $F = \mathbb{F}_p$ is a finite field with p elements and $F^{n \times n}$ is the set of $n \times n$ matrices (for this problem, let $n=2$).
    (a) Show that this map is surjective.
    (b) Prove that all nonzero values of the determinant are taken on the same number of times.

71. Let A be an $n \times n$ real matrix. Prove that there is a polynomial $f(t) = a_r t^r + a_{r-1}t^{r-1} + ... + a_1 t + a_0$ which has A as root, that is, such that $a_r A^r + a_{r-1}A^{r-1} + ... + a_1 A + a_0 I = 0$. Do this by showing that the matrices $I, A, A^2, ...$ are linearly dependent (in the space of $n \times n$ matrices).

72. An algebraic curve in $\mathbb{R}^2$ is the locus of zeros of a polynomial $f(x, y)$ in two variables. By a polynomial path in $\mathbb{R}^2$, we mean a parametrized path $x = x(t), y = y(t)$, where $x(t), y(t)$ are polynomials in t.
    (a) Prove that every polynomial path lies on a real algebraic curve by showing that, for sufficiently large n, the functions $x(t)^i y(t)^j$, $0 \le i,j \le n$, are linearly dependent.
    (b) Determine the algebraic curve which is the image of the path $x = t^2 + t, y = t^3$ explicitly, and draw it.

--- Generated Written-Answer Problems ---

73. Determine if the set $V = \mathbb{R}^2$ with standard vector addition but scalar multiplication defined by $c(x,y) = (cx, y/c)$ for $c \ne 0$ and $0(x,y) = (0,0)$ is a vector space over $\mathbb{R}$. Justify your answer by checking relevant axioms.

74. Let $P_2$ be the vector space of polynomials of degree at most 2. Is the set $W = \{p(x) \in P_2 \mid p(0) = 1\}$ a subspace of $P_2$? Explain.

75. Prove that the set of all $2 \times 2$ real matrices $A$ such that $A \begin{pmatrix} 1 \\ 1 \end{pmatrix} = \begin{pmatrix} 0 \\ 0 \end{pmatrix}$ is a subspace of $M_{2 \times 2}(\mathbb{R})$. Find a basis for this subspace.

76. What is the characteristic of the field $\mathbb{Q}$ of rational numbers? What is the characteristic of the field $\mathbb{F}_2(x)$ of rational functions over $\mathbb{F}_2$?

77. In the field $\mathbb{F}_{11}$, compute $( \bar{3} / \bar{5} ) + \bar{7} \cdot \bar{4}$. Express your answer as $\bar{k}$ where $0 \le k < 11$.

78. Let $v_1 = (1, 0, 1)$, $v_2 = (0, 1, 1)$, $v_3 = (1, 1, 0)$ in $\mathbb{R}^3$. Is the vector $w = (2, 3, 1)$ in the span of $\{v_1, v_2, v_3\}$? If so, express $w$ as a linear combination of $v_1, v_2, v_3$.

79. Determine whether the set of functions $\{\sin^2 x, \cos^2 x, \cos(2x)\}$ is linearly independent or dependent in the vector space of continuous functions on $\mathbb{R}$.

80. Find a basis for the subspace of $P_3$ (polynomials of degree at most 3) consisting of all polynomials $p(x)$ such that $p(1) = 0$ and $p'(0) = 0$. What is its dimension?

81. Let $V$ be a vector space with $dim(V)=n$. If $S$ is a set of $n$ vectors in $V$ that is linearly independent, prove that $S$ is a basis for $V$.

82. Let $W_1$ be the subspace of $\mathbb{R}^4$ spanned by $\{(1,0,1,0), (0,1,1,1)\}$ and $W_2$ be the subspace spanned by $\{(1,1,0,0), (0,0,1,1)\}$. Find a basis for $W_1 \cap W_2$ and $W_1 + W_2$.

83. Consider the basis $B = \{(1,2), (3,4)\}$ for $\mathbb{R}^2$. Find the coordinate vector of $v = (1,0)$ with respect to $B$.

84. Let $B = \{1, x, x^2\}$ and $B' = \{1, 1+x, 1+x+x^2\}$ be two bases for $P_2$. Find the change of basis matrix $P_{B \to B'}$ such that $[v]_{B'} = P_{B \to B'} [v]_B$. (Using the convention that if $B = B'Q$, then $[v]_{B'} = Q [v]_B$. So we need Q.)

85. How many $2 \times 2$ invertible matrices are there with entries in $\mathbb{F}_3$? (i.e., find the order of $GL_2(\mathbb{F}_3)$).

86. Let $V = \mathbb{R}^\infty$. Is the set of all sequences that converge to 0 a subspace of $V$? Is the set of all sequences that converge to 1 a subspace of $V$? Explain.

87. Prove or disprove: If $V = W_1 \oplus W_2$ and $V = W_1 \oplus W_3$, then $W_2 = W_3$.

88. Let $T: V \to W$ be an isomorphism of vector spaces. Prove that if $S = \{v_1, ..., v_k\}$ is a linearly independent set in $V$, then $T(S) = \{T(v_1), ..., T(v_k)\}$ is a linearly independent set in $W$.

89. Consider the vector space $M_{2 \times 2}(\mathbb{R})$. Let $W$ be the subspace of upper triangular matrices. Find a subspace $U$ such that $M_{2 \times 2}(\mathbb{R}) = W \oplus U$. Is $U$ unique?

90. Verify that the set of all functions $f: \mathbb{R} \to \mathbb{R}$ such that $f(0)=0$ forms a real vector space under the usual addition and scalar multiplication of functions.

91. Let $V$ be the set of positive real numbers. Define vector addition $x \oplus y = xy$ and scalar multiplication $c \odot x = x^c$ for $x, y \in V$ and $c \in \mathbb{R}$. Show that $V$ is a vector space over $\mathbb{R}$. What is the zero vector in this space? What is $-x$ (the additive inverse of $x$)?

92. Determine if the vectors $p_1(x) = 1+x^2$, $p_2(x) = x-x^2$, $p_3(x) = 1+x$ in $P_2$ are linearly independent.

93. Let $S = \{v_1, v_2, v_3\}$ be a linearly independent set in a vector space $V$. Is the set $\{v_1+v_2, v_2+v_3, v_3+v_1\}$ linearly independent? Prove or provide a counterexample.

94. Find the dimension of the vector space of all $3 \times 3$ skew-symmetric real matrices.

95. Let $B_1 = \{(1,0,0), (0,1,0)\}$ be a basis for a subspace $W_1$ of $\mathbb{R}^3$, and $B_2 = \{(1,1,1)\}$ be a basis for a subspace $W_2$ of $\mathbb{R}^3$. Is it true that $B_1 \cup B_2$ is a basis for $W_1+W_2$? If $W_1 \cap W_2 = \{0\}$, is it a basis for $W_1 \oplus W_2$?

96. Let $V = \mathbb{R}^2$. Old basis $E = \{(1,0), (0,1)\}$. New basis $B' = \{(2,1), (-1,1)\}$. Find the change of basis matrix P from E to B' such that if $v = E X = B' X'$, then $X' = PX$. (This requires P to be $[B']^{-1}$).

97. For $V = P_1$ (polynomials of degree at most 1), let $B = \{1, x\}$ and $B' = \{1+x, 1-x\}$.
    (a) Show $B'$ is a basis.
    (b) Find the coordinate vector of $p(x) = 3+5x$ with respect to $B'$.
    (c) Find the change of basis matrix from $B$ to $B'$.

98. Show that if a vector space $V$ has an infinite linearly independent set, then $V$ is infinite-dimensional.

99. Let $V = \text{Span}\{e^{x}, e^{-x}\}$ and $W = \text{Span}\{\sinh x, \cosh x\}$ be subspaces of the space of continuous functions. Are $V$ and $W$ equal? (Recall $\sinh x = (e^x - e^{-x})/2$, $\cosh x = (e^x + e^{-x})/2$).

100. Let $V$ be the vector space of $n \times n$ matrices over $\mathbb{R}$. Let $Tr(A)$ be the trace of matrix A. Is $W = \{A \in V \mid Tr(A) = 0\}$ a subspace? If so, what is its dimension?

101. Determine if the set of all pairs of real numbers $(x,y)$ such that $x \ge 0$ and $y \ge 0$ forms a subspace of $\mathbb{R}^2$.

102. Prove that if $\{v_1, v_2, ..., v_k\}$ spans a vector space $V$, then any set of $k+1$ vectors in $V$ must be linearly dependent.

103. Let $A$ be an $m \times n$ matrix. Prove that the null space of $A$ (i.e., the set of solutions to $AX=0$) is a subspace of $\mathbb{R}^n$.

104. Show that $\mathbb{C}$ (complex numbers) can be considered as a vector space over $\mathbb{R}$ (real numbers). What is a basis for this vector space? What is its dimension?

105. Show that $\mathbb{R}$ can be considered as a vector space over $\mathbb{Q}$ (rational numbers). Is this space finite-dimensional? Explain.

106. Find a basis for the vector space of all $2 \times 3$ real matrices. What is the dimension?

107. Let $W_1 = \{(x,y,z) \in \mathbb{R}^3 \mid x+y+z=0\}$ and $W_2 = \{(x,y,z) \in \mathbb{R}^3 \mid x=y=z\}$. Show that $\mathbb{R}^3 = W_1 \oplus W_2$.

108. If $V$ is a vector space and $S_1 \subseteq S_2 \subseteq V$, prove that $\text{Span}(S_1) \subseteq \text{Span}(S_2)$.

109. Let $v_1, v_2, v_3 \in \mathbb{R}^3$. If $\text{det}(v_1, v_2, v_3) \ne 0$ (where $v_i$ are column vectors of the matrix), show that $\{v_1, v_2, v_3\}$ is a basis for $\mathbb{R}^3$.

110. Consider $\mathbb{F}_2^n$. How many distinct one-dimensional subspaces does it have?

111. Let $S = \{A \in M_{2 \times 2}(\mathbb{R}) \mid A^t = A\}$ (symmetric matrices) and $K = \{A \in M_{2 \times 2}(\mathbb{R}) \mid A^t = -A\}$ (skew-symmetric matrices). Find bases for S and K, and show that $M_{2 \times 2}(\mathbb{R}) = S \oplus K$.

112. Prove that if $V$ is a finite-dimensional vector space and $W$ is a proper subspace of $V$ (i.e., $W \ne V$), then $dim(W) < dim(V)$.

113. Let $V$ be a vector space and $\{v_1, v_2, v_3\}$ be a basis for $V$. Is $\{v_1-v_2, v_2-v_3, v_3\}$ also a basis for $V$? Justify.

114. Let $W$ be the subspace of $\mathbb{R}^3$ spanned by $(1,1,0)$ and $(0,1,1)$. Find a vector $u \in \mathbb{R}^3$ such that $u \notin W$.

115. Prove that any set of vectors containing the zero vector is linearly dependent.

116. Let $V$ be an $n$-dimensional vector space. What is the maximum size of a linearly independent set in $V$? What is the minimum size of a spanning set for $V$?

117. Let $X = (x_1, x_2)^t$ be the coordinate vector of $v \in \mathbb{R}^2$ with respect to basis $B = \{(1,1), (1,-1)\}$. Let $X' = (x'_1, x'_2)^t$ be the coordinate vector of $v$ with respect to basis $B' = \{(1,0), (0,1)\}$. Find the matrix $P$ such that $X' = PX$.

118. Let $P_n$ be the space of polynomials with real coefficients of degree at most $n$. Define an isomorphism from $P_n$ to $\mathbb{R}^{n+1}$.

119. If $V$ is the vector space of real-valued continuous functions on $[0,1]$, show that the set of functions $S = \{1, x, x^2, x^3, ...\}$ is linearly independent. What does this imply about the dimension of $V$?

120. Let $W_1, W_2, W_3$ be subspaces of $V$. If $V = W_1 \oplus W_2$ and $W_1 = W_3 \oplus W_2$, does it imply $V = W_3 \oplus W_2 \oplus W_2$? Clarify the relationship. (The premise of the question $W_1 = W_3 \oplus W_2$ might be problematic if $W_2$ is meant to be the same $W_2$ as in $V=W_1 \oplus W_2$. A better rephrasing for a meaningful question: If $V = W_1 \oplus W_2$ and $W_1 = U_1 \oplus U_2$, show $V = U_1 \oplus U_2 \oplus W_2$.) Let's assume the question means: If $V = W_1 \oplus W_2$ and $W_1 = A \oplus B$, prove $V = A \oplus B \oplus W_2$.

# Chapter 4: Linear Transformations - Problems from the Book

1.  Let $T$ be left multiplication by the matrix
    $\begin{pmatrix} 1 & 2 & 0 & -1 & 5 \\ 2 & 0 & 2 & 0 & 1 \\ 1 & 1 & -1 & 3 & 2 \\ 0 & 3 & -3 & 2 & 6 \end{pmatrix}$.
    Compute $\ker T$ and $\text{im } T$ explicitly by exhibiting bases for these spaces, and verify (1.7) (The Dimension Formula: $\dim V = \text{rank} + \text{nullity}$).

2.  Determine the rank of the matrix
    $\begin{pmatrix} 11 & 12 & 13 & 14 \\ 21 & 22 & 23 & 24 \\ 31 & 32 & 33 & 34 \\ 41 & 42 & 43 & 44 \end{pmatrix}$.

3.  Let $T: V \to W$ be a linear transformation. Prove that $\ker T$ is a subspace of $V$ and that $\text{im } T$ is a subspace of $W$.

4.  Let $A$ be an $m \times n$ matrix. Prove that the space of solutions of the linear system $AX=0$ has dimension at least $n-m$.

5.  Let $A$ be a $k \times m$ matrix and let $B$ be an $n \times p$ matrix. Prove that the rule $M \mapsto AMB$ defines a linear transformation from the space $F^{m \times n}$ of $m \times n$ matrices to the space $F^{k \times p}$.

6.  Let $(v_1, \dots, v_n)$ be a subset of a vector space $V$. Prove that the map $\varphi: F^n \to V$ defined by $\varphi(X) = v_1x_1 + \dots + v_nx_n$ is a linear transformation. (Here $X = (x_1, \dots, x_n)^t$)

7.  When the field is one of the fields $F_p$, finite-dimensional vector spaces have finitely many elements. In this case, formula (1.6) (Dimension Formula) and formula (6.15) from Chapter 2 (for group homomorphisms: $|G| = |\ker \phi| |\text{im } \phi|$) both apply. Reconcile them.

8.  Prove that every $m \times n$ matrix $A$ of rank 1 has the form $A = XY^t$, where $X, Y$ are $m$- and $n$-dimensional column vectors.

9.  (a) The left shift operator $S^-$ on $V = \mathbb{R}^\infty$ is defined by $(a_1, a_2, \dots) \mapsto (a_2, a_3, \dots)$. Prove that $\ker S^- > 0$ (i.e., $\dim(\ker S^-) > 0$), but $\text{im } S^- = V$.
    (b) The right shift operator $S^+$ on $V = \mathbb{R}^\infty$ is defined by $(a_1, a_2, \dots) \mapsto (0, a_1, a_2, \dots)$. Prove that $\ker S^+ = \{0\}$, but $\text{im } S^+ < V$ (i.e., $\text{im } S^+$ is a proper subspace of $V$).

10. Determine the matrix of the differentiation operator $\frac{d}{dx}: P_n \to P_{n-1}$ with respect to the natural bases (see (1.4), e.g., $\{1, x, \dots, x^n\}$ for $P_n$).

11. Find all linear transformations $T: \mathbb{R}^2 \to \mathbb{R}^2$ which carry the line $y=x$ to the line $y=3x$.

12. Prove Proposition (2.9b) (Given any $m \times n$ matrix A, there are matrices $Q \in GL_m(F)$ and $P \in GL_n(F)$ so that $QAP^{-1}$ has the form $\begin{pmatrix} I_r & 0 \\ 0 & 0 \end{pmatrix}$) using row and column operations.

13. Let $T: \mathbb{R}^3 \to \mathbb{R}^2$ be the linear transformation defined by the rule $T(x_1, x_2, x_3)^t = (x_1+x_2, 2x_3-x_1)^t$. What is the matrix of $T$ with respect to the standard bases?

14. Let $A$ be an $n \times n$ matrix, and let $V=F^n$ denote the space of row vectors. What is the matrix of the linear operator "right multiplication by $A$" with respect to the standard basis of $V$?

15. Prove that different matrices define different linear transformations (assuming standard bases, or fixed bases). More precisely, if $A$ and $B$ are $m \times n$ matrices, and $T_A(X) = AX$ and $T_B(X)=BX$ for all $X \in F^n$. If $T_A = T_B$, prove $A=B$.

16. Describe left multiplication and right multiplication by the matrix (2.10) (the canonical form $\begin{pmatrix} I_r & 0 \\ 0 & 0 \end{pmatrix}$), and prove that the rank of this matrix is $r$.

17. Prove that $A$ and $A^t$ have the same rank.

18. Let $T_1, T_2$ be linear transformations from $V$ to $W$. Define $T_1+T_2$ and $cT_1$ by the rules $[T_1+T_2](v) = T_1(v)+T_2(v)$ and $[cT_1](v) = cT_1(v)$.
    (a) Prove that $T_1+T_2$ and $cT_1$ are linear transformations, and describe their matrices in terms of the matrices for $T_1, T_2$.
    (b) Let $L$ be the set of all linear transformations from $V$ to $W$. Prove that these laws make $L$ into a vector space, and compute its dimension.

19. Let $V$ be the vector space of real $2 \times 2$ symmetric matrices $X = \begin{pmatrix} x & y \\ y & z \end{pmatrix}$, and let $A = \begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix}$. Determine the matrix of the linear operator on $V$ defined by $X \mapsto AXA^t$, with respect to a suitable basis.

20. Let $A = (a_{ij})$, $B = (b_{ij})$ be $2 \times 2$ matrices, and consider the operator $T: M \mapsto AMB$ on the space $F^{2 \times 2}$ of $2 \times 2$ matrices. Find the matrix of $T$ with respect to the basis $(e_{11}, e_{12}, e_{21}, e_{22})$ of $F^{2 \times 2}$.

21. Let $T: V \to V$ be a linear operator on a vector space of dimension 2. Assume that $T$ is not multiplication by a scalar. Prove that there is a vector $v \in V$ such that $(v, T(v))$ is a basis of $V$, and describe the matrix of $T$ with respect to that basis.

22. Let $T$ be a linear operator on a vector space $V$, and let $c \in F$. Let $W$ be the set of eigenvectors of $T$ with eigenvalue $c$, together with $0$. Prove that $W$ is a $T$-invariant subspace.

23. Find all invariant subspaces of the real linear operator whose matrix is as follows.
    (a) $\begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}$
    (b) $\begin{pmatrix} 1 & 1 \\ 0 & 2 \end{pmatrix}$

24. An operator on a vector space $V$ is called nilpotent if $T^k=0$ for some $k$. Let $T$ be a nilpotent operator, and let $W^i = \text{im } T^i$.
    (a) Prove that if $W^i \neq \{0\}$, then $\dim W^{i+1} < \dim W^i$.
    (b) Prove that if $V$ is a space of dimension $n$ and if $T$ is nilpotent, then $T^n=0$.

25. Let $T$ be a linear operator on $\mathbb{R}^2$. Prove that if $T$ carries a line $l$ to $l$, then it also carries every line parallel to $l$ to another line parallel to $l$.

26. Prove that the composition $T_1 T_2$ of linear operators on a vector space is a linear operator, and compute its matrix in terms of the matrices $A_1, A_2$ of $T_1, T_2$.

27. Let $P$ be the real vector space of polynomials $p(x) = a_0 + a_1x + \dots + a_nx^n$ of degree $\le n$, and let $D$ denote the derivative $\frac{d}{dx}$, considered as a linear operator on $P$.
    (a) Find the matrix of $D$ with respect to a convenient basis, and prove that $D$ is a nilpotent operator.
    (b) Determine all the $D$-invariant subspaces.

28. Prove that the matrices $\begin{pmatrix} a & b \\ 0 & d \end{pmatrix}$ and $\begin{pmatrix} a & 0 \\ 0 & d \end{pmatrix}$ ($b \neq 0$) are similar if and only if $a \neq d$.

29. Let $A = \begin{pmatrix} * & * \\ * & * \end{pmatrix}$ be a real $2 \times 2$ matrix. Prove that $A$ can be reduced to a matrix $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ by row and column operations of the form $A \mapsto EAE^{-1}$, unless $b=c=0$ and $a=d$. Make a careful case analysis to take care of the possibility that $b$ or $c$ is zero.

30. Let $T$ be a linear operator on $\mathbb{R}^2$ with two linearly independent eigenvectors $v_1, v_2$. Assume that the eigenvalues $c_1, c_2$ of these operators are positive and that $c_1 > c_2$. Let $l_i$ be the line spanned by $v_i$.
    (a) The operator $T$ carries every line $l$ through the origin to another line. Using the parallelogram law for vector addition, show that every line $l \neq l_2$ is shifted away from $l_2$ toward $l_1$.
    (b) Use (a) to prove that the only eigenvectors are multiples of $v_1$ or $v_2$.
    (c) Describe the effect on lines when there is a single line carried to itself, with positive eigenvalue.

31. Consider an arbitrary $2 \times 2$ matrix $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$. The condition that a column vector $X$ be an eigenvector for left multiplication by $A$ is that $Y=AX$ be parallel to $X$, which means that the slopes $s=x_2/x_1$ and $s'=y_2/y_1$ are equal.
    (a) Find the equation in $s$ which expresses this equality.
    (b) For which $A$ is $s=0$ a solution? $s=\infty$?
    (c) Prove that if the entries of $A$ are positive real numbers, then there is an eigenvector in the first quadrant and also one in the second quadrant.

32. Compute the characteristic polynomials, eigenvalues, and eigenvectors of the following complex matrices.
    (a) $\begin{pmatrix} -2 & 2 \\ -2 & 3 \end{pmatrix}$
    (b) $\begin{pmatrix} 1 & i \\ -i & 1 \end{pmatrix}$

33. (a) Prove that the eigenvalues of a real symmetric $2 \times 2$ matrix are real numbers.
    (b) Prove that a real $2 \times 2$ matrix whose off-diagonal entries are positive has real eigenvalues.

34. Find the complex eigenvalues and eigenvectors of the rotation matrix $\begin{pmatrix} \cos \theta & -\sin \theta \\ \sin \theta & \cos \theta \end{pmatrix}$.

35. Prove that a real $3 \times 3$ matrix has at least one real eigenvalue.

36. Determine the characteristic polynomial of the matrix
    $\begin{pmatrix} 0 & 1 & & & \\ 1 & 0 & 1 & & \\ & 1 & \ddots & \ddots & \\ & & \ddots & 0 & 1 \\ & & & 1 & 0 \end{pmatrix}$ (entries are 0 except for 1s on sub- and super-diagonals).

37. Prove Proposition (4.18) (The characteristic polynomial $p(t) = t^n - (\text{tr } A)t^{n-1} + \dots + (-1)^n \det A$).

38. (a) Let $T$ be a linear operator having two linearly independent eigenvectors with the same eigenvalue $\lambda$. Is it true that $\lambda$ is a multiple root of the characteristic polynomial of $T$?
    (b) Suppose that $\lambda$ is a multiple root of the characteristic polynomial. Does $T$ have two linearly independent eigenvectors with eigenvalue $\lambda$?

39. Let $V$ be a vector space with basis $(v_1, \dots, v_n)$ over a field $F$, and let $a_1, \dots, a_{n-1}$ be elements of $F$. Define a linear operator on $V$ by the rules $T(v_i)=v_{i+1}$ if $i<n$ and $T(v_n) = a_1v_1 + a_2v_2 + \dots + a_{n-1}v_{n-1}$.
    (a) Determine the matrix of $T$ with respect to the given basis.
    (b) Determine the characteristic polynomial of $T$.

40. Do $A$ and $A^t$ have the same eigenvalues? the same eigenvectors?

41. (a) Use the characteristic polynomial to prove that a $2 \times 2$ real matrix $P$ all of whose entries are positive has two distinct real eigenvalues.
    (b) Prove that the larger eigenvalue has an eigenvector in the first quadrant, and the smaller eigenvalue has an eigenvector in the second quadrant.

42. (a) Let $A$ be a $3 \times 3$ matrix, with characteristic polynomial $p(t) = t^3 - (\text{tr } A)t^2 + s_1t - (\det A)$. Prove that $s_1$ is the sum of the symmetric $2 \times 2$ subdeterminants:
    $s_1 = \det \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{pmatrix} + \det \begin{pmatrix} a_{11} & a_{13} \\ a_{31} & a_{33} \end{pmatrix} + \det \begin{pmatrix} a_{22} & a_{23} \\ a_{32} & a_{33} \end{pmatrix}$.
    *(b) Generalize to $n \times n$ matrices.

43. Let $T$ be a linear operator on a space of dimension $n$, with eigenvalues $\lambda_1, \dots, \lambda_n$.
    (a) Prove that $\text{tr } T = \lambda_1 + \dots + \lambda_n$ and that $\det T = \lambda_1 \dots \lambda_n$.
    (b) Determine the other coefficients of the characteristic polynomial in terms of the eigenvalues.

*44. Consider the linear operator of left multiplication of an $n \times n$ matrix $A$ on the space $F^{n \times n}$ of all $n \times n$ matrices. Compute the trace and the determinant of this operator.

*45. Let $P$ be a real matrix such that $P^t = P^2$. What are the possible eigenvalues of $P$?

46. Let $A$ be a matrix such that $A^n = I$. Prove that the eigenvalues of $A$ are powers of $n$-th root of unity $\zeta_n = e^{2\pi i/n}$.

47. What is the matrix of the three-dimensional rotation through the angle $\theta$ about the axis $e_2$? (Note: text uses $e_1$ in (5.2), this question asks for $e_2$).

48. Prove that every orthonormal set of $n$ vectors in $\mathbb{R}^n$ is a basis.

49. Prove algebraically that a real $2 \times 2$ matrix $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ represents a rotation if and only if it is in $SO_2$.

50. (a) Prove that $O_n$ and $SO_n$ are subgroups of $GL_n(\mathbb{R})$, and determine the index of $SO_n$ in $O_n$.
    (b) Is $O_2$ isomorphic to the product group $SO_2 \times \{\pm I\}$? Is $O_3$ isomorphic to $SO_3 \times \{\pm I\}$?

51. What are the eigenvalues of the matrix $A$ which represents the rotation of $\mathbb{R}^3$ by $\theta$ about an axis $v$?

52. Let $A$ be a matrix in $O_3$ whose determinant is $-1$. Prove that $-1$ is an eigenvalue of $A$.

53. Let $A$ be an orthogonal $2 \times 2$ matrix whose determinant is $-1$. Prove that $A$ represents a reflection about a line through the origin.

54. Let $A$ be an element of $SO_3$, with angle of rotation $\theta$. Show that $\cos \theta = \frac{1}{2}(\text{tr } A - 1)$.

55. Every real polynomial of degree 3 has a real root. Use this fact to give a less tricky proof of Lemma (5.23) (Every element $A \in SO_3$ has eigenvalue 1).

*56. Find a geometric way to determine the axis of rotation for the composition of two three-dimensional rotations.

57. Let $v$ be a vector of unit length, and let $P$ be the plane in $\mathbb{R}^3$ orthogonal to $v$. Describe a bijective correspondence between points on the unit circle in $P$ and matrices $A \in SO_3$ whose first column (when written in a basis where $v$ is the first basis vector) is $v$ (or whose axis of rotation is $v$).

58. Describe geometrically the action of an orthogonal matrix with determinant $-1$.

*59. Let $A$ be an element of $SO_3$. Show that if it is defined, the vector $((a_{23}-a_{32}), (a_{31}-a_{13}), (a_{12}-a_{21}))^t$ is an eigenvector with eigenvalue 1. (The problem statement in the PDF has sums, likely a typo, common form is differences for axis vector from skew part).

60. (a) Find the eigenvectors and eigenvalues of the matrix $\begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$.
    (b) Find a matrix $P$ such that $PAP^{-1}$ is diagonal.
    (c) Compute $\begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}^{30}$.

61. Diagonalize the rotation matrix $\begin{pmatrix} \cos \theta & -\sin \theta \\ \sin \theta & \cos \theta \end{pmatrix}$ using complex numbers.

62. Prove that if $A, B$ are $n \times n$ matrices and if $A$ is nonsingular, then $AB$ is similar to $BA$.

63. Let $A$ be a complex matrix having zero as its only eigenvalue. Prove or disprove: $A$ is nilpotent.

64. In each case, if the matrix is diagonalizable, find a matrix $P$ such that $PAP^{-1}$ is diagonal.
    (a) $\begin{pmatrix} -2 & 2 \\ -2 & 3 \end{pmatrix}$
    (b) $\begin{pmatrix} 1 & i \\ -i & 1 \end{pmatrix}$
    (c) $\begin{pmatrix} 1 & 2 & 3 \\ 0 & 4 & 5 \\ 0 & 0 & 6 \end{pmatrix}$
    (d) $\begin{pmatrix} 0 & 0 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{pmatrix}$

65. Can the diagonalization (6.1) be done with a matrix $P \in SL_n$?

66. Prove that a linear operator $T$ is nilpotent if and only if there is a basis of $V$ such that the matrix of $T$ is upper triangular, with diagonal entries zero.

67. Let $T$ be a linear operator on a space of dimension 2. Assume that the characteristic polynomial of $T$ is $(t-a)^2$. Prove that there is a basis of $V$ such that the matrix of $T$ has one of the two forms $\begin{pmatrix} a & 1 \\ 0 & a \end{pmatrix}$, $\begin{pmatrix} a & 0 \\ 0 & a \end{pmatrix}$.

68. Let $A$ be a nilpotent matrix. Prove that $\det(I+A)=1$.

69. Prove that if $A$ is a nilpotent $n \times n$ matrix, then $A^n=0$.

70. Find all real $2 \times 2$ matrices such that $A^2=I$, and describe geometrically the way they operate by left multiplication on $\mathbb{R}^2$.

71. Let $M$ be a matrix made up of two diagonal blocks: $M = \begin{pmatrix} A & 0 \\ 0 & D \end{pmatrix}$. Prove that $M$ is diagonalizable if and only if $A$ and $D$ are.

72. (a) Let $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$ be a $2 \times 2$ matrix with eigenvalue $\lambda$. Show that $(b, \lambda-a)^t$ (if not zero) is an eigenvector for $A$. (Assume $b \neq 0$ or $\lambda-a \neq 0$). Or, $( \lambda-d, c)^t$.
    (b) Find a matrix $P$ such that $PAP^{-1}$ is diagonal, if $A$ has two distinct eigenvalues $\lambda_1 \neq \lambda_2$.

73. Let $A$ be a complex $n \times n$ matrix. Prove that there is a matrix $B$ arbitrarily close to $A$ (meaning that $|b_{ij}-a_{ij}|$ can be made arbitrarily small for all $i,j$) such that $B$ has $n$ distinct eigenvalues.

*74. Let $A$ be a complex $n \times n$ matrix with $n$ distinct eigenvalues $\lambda_1, \dots, \lambda_n$. Assume that $\lambda_1$ is the largest eigenvalue, that is, that $|\lambda_1| > |\lambda_i|$ for all $i > 1$. Prove that for most vectors $X$ the sequence $X_k = \lambda_1^{-k}A^kX$ converges to an eigenvector $Y$ with eigenvalue $\lambda_1$, and describe precisely what the conditions on $X$ are for this to be the case.

75. (a) Use the method of the previous problem to compute the largest eigenvalue of the matrix $\begin{pmatrix} 3 & 1 \\ 3 & 4 \end{pmatrix}$ to three-place accuracy.
    (b) Compute the largest eigenvalue of the matrix $\begin{pmatrix} 1 & 2 & 3 \\ 1 & 1 & 1 \\ 1 & 0 & 1 \end{pmatrix}$ to three-place accuracy.

*76. Let $A$ be $m \times m$ and $B$ be $n \times n$ complex matrices, and consider the linear operator $T$ on the space $F^{m \times n}$ of all complex matrices defined by $T(M) = AMB$.
    (a) Show how to construct an eigenvector for $T$ out of a pair of column vectors $X, Y$, where $X$ is an eigenvector for $A$ and $Y$ is an eigenvector for $B^t$.
    (b) Determine the eigenvalues of $T$ in terms of those of $A$ and $B$.

*77. Let $A$ be an $n \times n$ complex matrix.
    (a) Consider the linear operator $T$ defined on the space $F^{n \times n}$ of all complex $n \times n$ matrices by the rule $T(B) = AB - BA$. Prove that the rank of this operator is at most $n^2-n$.
    (b) Determine the eigenvalues of $T$ in terms of the eigenvalues $\lambda_1, \dots, \lambda_n$ of $A$.

78. Let $v$ be an eigenvector for the matrix $A$, with eigenvalue $c$. Prove that $e^{ct}v$ solves the differential equation $\frac{dX}{dt}=AX$.

79. Solve the equation $\frac{dX}{dt}=AX$ for the following matrices $A$:
    (a) $\begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$
    (b) $\begin{pmatrix} -2 & 2 \\ -2 & 3 \end{pmatrix}$
    (c) $\begin{pmatrix} 1 & i \\ -i & 1 \end{pmatrix}$
    (d) $\begin{pmatrix} 1 & 2 & 3 \\ 0 & 4 & 5 \\ 0 & 0 & 6 \end{pmatrix}$
    (e) $\begin{pmatrix} 0 & 0 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{pmatrix}$

80. Explain why diagonalization gives the general solution.

81. (a) Prove Proposition (7.16) (General solution form $X = P^{-1}\tilde{X}$ where $\tilde{x}_i = c_i e^{\lambda_i t}$).
    (b) Why is it enough to write down the real and imaginary parts to get the general solution (when eigenvalues are complex for a real matrix A)?

82. Prove Lemma (7.25) (If $X(t)$ is a complex solution to $X'=AX$ with real $A$, then $\text{Re}(X)$ and $\text{Im}(X)$ are real solutions).

83. Solve the inhomogeneous differential equation $\frac{dX}{dt} = AX+B$ in terms of the solutions to the homogeneous equation $\frac{dX}{dt}=AX$. (Hint: Variation of parameters or use integrating factor if $A$ is scalar. For matrix case, try $X_p(t) = e^{tA} \int e^{-sA} B(s) ds$).

84. A differential equation of the form $d^nx/dt^n + a_{n-1}d^{n-1}x/dt^{n-1} + \dots + a_1 dx/dt + a_0x = 0$ can be rewritten as a system of first-order equations by the following trick: We introduce unknown functions $x_0, x_1, \dots, x_{n-1}$ with $x=x_0$, and we set $dx_i/dt = x_{i+1}$ for $i=0, \dots, n-2$. The original equation can be rewritten as the system $dx_i/dt = x_{i+1}$, for $i=0, \dots, n-2$, and $dx_{n-1}/dt = -(a_{n-1}x_{n-1} + \dots + a_1x_1 + a_0x_0)$. Determine the matrix which represents this system of equations.

85. (a) Rewrite the second-order linear equation in one variable $\frac{d^2x}{dt^2} + b\frac{dx}{dt} + cx = 0$ as a system of two first-order equations in two unknowns $x_0=x, x_1=dx/dt$.
    (b) Solve the system when $b=-4$ and $c=3$.

86. Let $A$ be an $n \times n$ matrix, and let $B(t)$ be a column vector of continuous functions on the interval $[\alpha, \beta]$. Define $F(t) = \int_{\alpha}^{t} e^{-sA}B(s)ds$.
    (a) Prove that $X=e^{tA}F(t)$ (this is $X(t) = e^{tA}\int_{\alpha}^{t} e^{-sA}B(s)ds$) is a solution of the differential equation $X' = AX+B(t)$ on the interval $(\alpha, \beta)$ satisfying $X(\alpha)=0$.
    (b) Determine all solutions of this equation on the interval.

87. Compute $e^A$ for the following matrices $A$:
    (a) $\begin{pmatrix} 0 & 1 \\ -1 & 0 \end{pmatrix}$
    (b) $\begin{pmatrix} a & b \\ 0 & a \end{pmatrix}$

88. Let $A = \begin{pmatrix} 1 & 1 \\ 1 & 2 \end{pmatrix}$.
    (a) Compute $e^A$ directly from the expansion. (This will be hard, stop after a few terms or use a trick.)
    (b) Compute $e^A$ by diagonalizing the matrix.

89. Compute $e^A$ for the following matrices $A$:
    (a) $\begin{pmatrix} 0 & -b & 0 \\ b & 0 & 0 \\ 0 & 0 & c \end{pmatrix}$
    (b) $\begin{pmatrix} 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \end{pmatrix}$ (a Jordan block for eigenvalue 0)

90. Compute $e^A$ for the following matrices A:
    (a) $\begin{pmatrix} 2\pi i & 2\pi i \\ 0 & 2\pi i \end{pmatrix}$
    (b) $\begin{pmatrix} 6\pi i & 4\pi i \\ 2\pi i & 8\pi i \end{pmatrix}$ (Hint: this might be related to $A = P D P^{-1} + N$ with $N$ nilpotent and $PD P^{-1}$ commuting with $N$)

91. Let $A$ be an $n \times n$ matrix. Prove that the map $t \mapsto e^{tA}$ is a homomorphism from the additive group $\mathbb{R}^+$ to $GL_n(\mathbb{C})$.

92. Find two matrices $A, B$ such that $e^{A+B} \neq e^A e^B$.

93. Prove the formula $e^{\text{trace } A} = \det(e^A)$.

94. Solve the differential equation $\frac{dX}{dt} = AX$, when $A = \begin{pmatrix} 2 & 1 \\ 0 & 2 \end{pmatrix}$.

95. Let $f(t)$ be a polynomial, and let $T$ be a linear operator. Prove that $f(T)$ is a linear operator.

96. Let $A$ be a symmetric matrix, and let $f(t)$ be a polynomial. Prove that $f(A)$ is symmetric.

97. Prove the product rule for differentiation of matrix-valued functions: $(A(t)B(t))' = A'(t)B(t) + A(t)B'(t)$.

98. Let $A(t), B(t)$ be differentiable matrix-valued functions of $t$. Compute the following.
    (a) $d/dt (A(t)^3)$
    (b) $d/dt (A(t)^{-1})$, assuming that $A(t)$ is invertible for all $t$.
    (c) $d/dt (A(t)B(t)^{-1})$

99. Let $X$ be an eigenvector of an $n \times n$ matrix $A$, with eigenvalue $\lambda$.
    (a) Prove that if $A$ is invertible then $X$ is also an eigenvector for $A^{-1}$, and that its eigenvalue is $\lambda^{-1}$.
    (b) Let $p(t)$ be a polynomial. Then $X$ is an eigenvector for $p(A)$, with eigenvalue $p(\lambda)$.
    (c) Prove that $X$ is an eigenvector for $e^A$, with eigenvalue $e^\lambda$.

100. For an $n \times n$ matrix $A$, define $\sin A$ and $\cos A$ by using the Taylor's series expansions for $\sin x$ and $\cos x$.
    (a) Prove that these series converge for all $A$.
    (b) Prove that $\sin(tA)$ is a differentiable function of $t$ and that $d(\sin tA)/dt = A \cos tA$.

101. Discuss the range of validity of the following identities.
    (a) $\cos^2 A + \sin^2 A = I$
    (b) $e^{iA} = \cos A + i \sin A$
    (c) $\sin(A+B) = \sin A \cos B + \cos A \sin B$
    (d) $\cos(A+B) = \cos A \cos B - \sin A \sin B$
    (e) $e^{2\pi i A} = I$ (Is this always true for any matrix $A$?)
    (f) $d(e^{A(t)})/dt = e^{A(t)}A'(t)$, where $A(t)$ is a differentiable matrix-valued function of $t$. (Be careful!)

102. (a) Derive the product rule for differentiation of complex-valued functions in two ways: directly, and by writing $x(t)=u(t)+iv(t)$ and applying the product rule for real-valued functions.
    (b) Let $f(t)$ be a complex-valued function of a real variable $t$, and let $\phi(u)$ be a real-valued function of $u$. State and prove the chain rule for $f(\phi(u))$.

103. (a) Let $B_k$ be a sequence of $m \times n$ matrices which converges to a matrix $B$, and let $P$ be an $m \times m$ matrix. Prove that $PB_k$ converges to $PB$.
    (b) Prove that if $m=n$ and $P$ is invertible, then $PB_kP^{-1}$ converges to $PBP^{-1}$.

104. Let $f(x) = \sum c_k x^k$ be a power series such that $\sum c_k A^k$ converges when $A$ is a sufficiently small $n \times n$ matrix. Prove that $A$ and $f(A)$ commute.

105. Determine $\frac{d}{dt} \det A(t)$, when $A(t)$ is a differentiable matrix function of $t$. (This is Jacobi's formula).

106. What are the possible eigenvalues of a linear operator $T$ such that (a) $T^2=I$, (b) $T^k=0$ (nilpotent), (c) $T^2 - 5T + 6I = 0$?

107. A linear operator $T$ is called nilpotent if some power of $T$ is zero.
    (a) Prove that $T$ is nilpotent if and only if its characteristic polynomial is $t^n$, $n = \dim V$.
    (b) Prove that if $T$ is a nilpotent operator on a vector space of dimension $n$, then $T^n=0$.
    (c) A linear operator $T$ is called unipotent if $T-I$ is nilpotent. Determine the characteristic polynomial of a unipotent operator. What are its possible eigenvalues?

108. Let $A$ be an $n \times n$ complex matrix. Prove that if trace $A^i=0$ for all $i \ge 1$, then $A$ is nilpotent.

*109. Let $A, B$ be complex $n \times n$ matrices, and let $C=AB-BA$. Prove that if $C$ commutes with $A$ then $C$ is nilpotent.

110. Let $\lambda_1, \dots, \lambda_n$ be the roots of the characteristic polynomial $p(t)$ of a complex matrix $A$. Prove the formulas trace $A = \lambda_1 + \dots + \lambda_n$ and $\det A = \lambda_1 \dots \lambda_n$.

111. Let $T$ be a linear operator on a real vector space $V$ such that $T^2=I$. Define subspaces as follows: $W^+ = \{v \in V \mid T(v)=v\}$, $W^- = \{v \in V \mid T(v)=-v\}$. Prove that $V$ is isomorphic to the direct sum $W^+ \oplus W^-$.

112. The Frobenius norm $|A|_F$ of an $n \times n$ matrix $A$ is defined to be the length of $A$ when it is considered as an $n^2$-dimensional vector: $|A|_F^2 = \sum |a_{ij}|^2$. Prove the following inequalities: $|A+B|_F \le |A|_F + |B|_F$ and $|AB|_F \le |A|_F |B|_F$.

113. Let $T: V \to V$ be a linear operator on a finite-dimensional vector space $V$. Prove that there is an integer $k$ so that $(\ker T^k) \cap (\text{im } T^k) = \{0\}$.

114. Which infinite matrices represent linear operators on the space $Z$ (space of sequences with finitely many non-zero terms) [Chapter 3 (5.2d)]?

*115. The $k \times k$ minors of an $m \times n$ matrix $A$ are the determinants of the square submatrices obtained by crossing out $m-k$ rows and $n-k$ columns. Let $A$ be a matrix of rank $r$. Prove that some $r \times r$ minor is non-zero (invertible submatrix) and that no $(r+1) \times (r+1)$ minor is non-zero.

116. Let $\varphi: F^n \to F^m$ be left multiplication by an $m \times n$ matrix $A$. Prove that the following are equivalent.
    (a) $A$ has a right inverse, a matrix $B$ such that $AB=I$.
    (b) $\varphi$ is surjective.
    (c) There is an $m \times m$ minor of $A$ whose determinant is not zero (i.e., rank of A is m).

117. Let $\varphi: F^n \to F^m$ be left multiplication by an $m \times n$ matrix $A$. Prove that the following are equivalent.
    (a) $A$ has a left inverse, a matrix $B$ such that $BA=I$.
    (b) $\varphi$ is injective.
    (c) There is an $n \times n$ minor of $A$ whose determinant is not zero (i.e., rank of A is n).

*118. Let $A$ be an $n \times n$ matrix such that $A^k=I$ for some $k \ge 1$. Prove that if $A$ has only one eigenvalue $\xi$, then $A = \xi I$.

119. (a) Without using the characteristic polynomial, prove that a linear operator on a vector space of dimension $n$ can have at most $n$ different eigenvalues.
    (b) Use (a) to prove that a polynomial of degree $n$ with coefficients in a field $F$ has at most $n$ roots in $F$.

120. Let $A$ be an $n \times n$ matrix, and let $p(t) = t^n + c_{n-1}t^{n-1} + \dots + c_1t + c_0$ be its characteristic polynomial. The Cayley-Hamilton Theorem asserts that $p(A) = A^n + c_{n-1}A^{n-1} + \dots + c_1A + c_0I = 0$.
    (a) Prove the Cayley-Hamilton Theorem for $2 \times 2$ matrices.
    (b) Prove it for diagonal matrices.
    (c) Prove it for diagonalizable matrices.
*   (d) Show that every complex $n \times n$ matrix is arbitrarily close to a diagonalizable matrix, and use this fact to extend the proof for diagonalizable matrices to all complex matrices by continuity.

121. (a) Use the Cayley-Hamilton Theorem to give an expression for $A^{-1}$ in terms of $A$, $(\det A)^{-1}$, and the coefficients of the characteristic polynomial.
    (b) Verify this expression in the $2 \times 2$ case by direct computation.

*122. Let $A$ be a $2 \times 2$ matrix. The Cayley-Hamilton Theorem allows all powers of $A$ to be written as linear combinations of $I$ and $A$. Therefore it is plausible that $e^A$ is also such a linear combination.
    (a) Prove that if $a,b$ are the eigenvalues of $A$ and if $a \neq b$, then $e^A = \frac{a e^b - b e^a}{a-b}I + \frac{e^a - e^b}{a-b}A$.
    (b) Find the correct formula for the case that $A$ has two equal eigenvalues.

123. The Fibonacci numbers $0, 1, 1, 2, 3, 5, 8, \dots$ are defined by the recursive relations $f_n = f_{n-1}+f_{n-2}$, with the initial conditions $f_0=0, f_1=1$. This recursive relation can be written in matrix form as $\begin{pmatrix} f_n \\ f_{n-1} \end{pmatrix} = \begin{pmatrix} 1 & 1 \\ 1 & 0 \end{pmatrix} \begin{pmatrix} f_{n-1} \\ f_{n-2} \end{pmatrix}$.
    (a) Prove the formula $f_n = \frac{1}{\sqrt{5}}\left[ \left(\frac{1+\sqrt{5}}{2}\right)^n - \left(\frac{1-\sqrt{5}}{2}\right)^n \right]$. (This is Binet's formula)
    (b) Suppose that the sequence $a_n$ is defined by the relation $a_n = \frac{1}{2}(a_{n-1}+a_{n-2})$. Compute $\lim_{n \to \infty} a_n$ in terms of $a_0, a_1$.

*124. Let $A$ be an $n \times n$ real positive matrix (all entries $a_{ij} > 0$), and let $X \in \mathbb{R}^n$ be a column vector. Let us use the shorthand notation $X > 0$ or $X \ge 0$ to mean that all entries of the vector $X$ are positive or nonnegative, respectively. By "positive quadrant" we mean the set of vectors $X \ge 0$. (But note that $X \ge 0$ and $X \neq 0$ do not imply $X>0$ in our sense.)
    (a) Prove that if $X \ge 0$ and $X \neq 0$ then $AX > 0$.
    (b) Let $C$ denote the set of pairs $(X,t)$, $t \in \mathbb{R}$, such that $X \ge 0, |X|=1$, and $(A-tI)X \ge 0$. Prove that $C$ is a compact set in $\mathbb{R}^{n+1}$.
    (c) The function $t$ takes on a maximum value on $C$, say at the point $(X_0, t_0)$. Then $(A-t_0I)X_0 \ge 0$. Prove that $(A-t_0I)X_0=0$.
    (d) Prove that $X_0$ is an eigenvector with eigenvalue $t_0$ by showing that otherwise the vector $AX_0 = X_1$ would contradict the maximality of $t_0$. (Perron-Frobenius theorem related).
    (e) Prove that $t_0$ is the eigenvalue of $A$ with largest absolute value.

*125. Let $A=A(t)$ be a matrix of functions. What goes wrong when you try to prove that, in analogy with $n=1$, the matrix $\exp\left(\int_0^t A(u)du\right)$ is a solution of the system $dX/dt = AX$? Can you find conditions on the matrix function $A(t)$ which will make this a solution?

--- Generated Problems ---

126. Define what it means for a mapping $T: V \to W$ to be a linear transformation between vector spaces $V$ and $W$ over a field $F$. Give an example of a linear transformation from $\mathbb{R}^2$ to $\mathbb{R}^3$ and an example of a map that is not a linear transformation.

127. Let $T: P_2(\mathbb{R}) \to P_2(\mathbb{R})$ be defined by $T(p(x)) = p(x) + p'(x)$.
    (a) Show that $T$ is a linear operator.
    (b) Find the matrix of $T$ with respect to the basis $\{1, x, x^2\}$.
    (c) Find $\ker T$ and $\text{im } T$. Is $T$ invertible?

128. Let $A = \begin{pmatrix} 1 & 2 \\ 3 & 6 \end{pmatrix}$. Consider $T_A: \mathbb{R}^2 \to \mathbb{R}^2$ defined by $T_A(v) = Av$.
    (a) Find a basis for $\ker T_A$.
    (b) Find a basis for $\text{im } T_A$.
    (c) What is the rank and nullity of $T_A$? Verify the Dimension Formula.

129. Suppose $T: V \to W$ is a linear transformation. Prove that if $v_1, \dots, v_k \in V$ are linearly dependent, then $T(v_1), \dots, T(v_k) \in W$ are linearly dependent. Is the converse true? (If $T(v_i)$ are linearly dependent, are $v_i$ necessarily linearly dependent?)

130. Let $T: \mathbb{R}^3 \to \mathbb{R}^3$ be the linear operator defined by $T(x,y,z) = (x+y, y+z, z+x)$. Find the matrix of $T$ with respect to the standard basis. Then, find the matrix of $T$ with respect to the basis $B' = \{(1,0,1), (0,1,1), (1,1,0)\}$.

131. Prove that two similar matrices have the same determinant, trace, and characteristic polynomial.

132. Let $W$ be the subspace of $\mathbb{R}^3$ spanned by $(1,1,0)$ and $(0,1,1)$. Let $T: \mathbb{R}^3 \to \mathbb{R}^3$ be the projection onto $W$ along the direction of $(1,0,-1)$.
    (a) Show that $W$ is $T$-invariant.
    (b) Find the matrix of $T$ with respect to a basis adapted to $W$ (i.e., first two basis vectors in $W$, third is $(1,0,-1)$).

133. Find the eigenvalues and a basis for each eigenspace of the matrix $A = \begin{pmatrix} 2 & -1 & 1 \\ 0 & 3 & -1 \\ 2 & 1 & 3 \end{pmatrix}$.

134. Determine if the matrix $A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}$ is diagonalizable. If yes, find $P$ such that $P^{-1}AP$ is diagonal. If no, explain why not.

135. Let $T$ be a linear operator on a finite-dimensional vector space $V$. If $V$ has a basis consisting of eigenvectors of $T$, prove that the matrix of $T$ with respect to this basis is diagonal.

136. If $A$ is an $n \times n$ matrix such that $A^k=0$ for some positive integer $k$ (i.e., $A$ is nilpotent), show that $0$ is the only eigenvalue of $A$.

137. Let $A$ be an $n \times n$ matrix over $\mathbb{C}$. Prove that $A$ can be brought to an upper triangular form by a similarity transformation $P^{-1}AP$.

138. Define an orthogonal matrix. Show that if $A$ is an orthogonal matrix, then $A^{-1}$ is also an orthogonal matrix. Show that the product of two orthogonal matrices is orthogonal.

139. Let $A = \begin{pmatrix} \cos \theta & -\sin \theta & 0 \\ \sin \theta & \cos \theta & 0 \\ 0 & 0 & 1 \end{pmatrix}$. Show that $A \in SO(3)$. Describe geometrically the linear transformation $T(x) = Ax$. Find its axis of rotation.

140. Prove that if $A$ is a real $n \times n$ matrix, then the eigenvalues of $A^tA$ are non-negative.

141. Solve the system of differential equations $X' = AX$ where $A = \begin{pmatrix} 1 & 3 \\ 1 & -1 \end{pmatrix}$. Find the particular solution for which $X(0) = (1,0)^t$.

142. Compute $e^A$ for $A = \begin{pmatrix} 2 & 1 \\ 0 & 2 \end{pmatrix}$. Use this to solve $X' = AX$ with $X(0) = (1,1)^t$.

143. If $A$ is diagonalizable, say $A = PDP^{-1}$ with $D$ diagonal, show that $e^A = Pe^DP^{-1}$. Use this to compute $e^A$ for $A = \begin{pmatrix} 0 & 1 \\ -2 & 3 \end{pmatrix}$.

144. Explain the geometric interpretation of the kernel and image of a linear transformation $T: \mathbb{R}^2 \to \mathbb{R}^2$. Consider cases where $\dim(\ker T)$ is 0, 1, or 2.

145. Let $T: V \to W$ be a linear transformation. Show that $T$ is injective if and only if $\ker T = \{0_V\}$.

146. Let $V$ be the space of $2 \times 2$ real matrices. Let $T: V \to V$ be defined by $T(M) = M^t$. Show $T$ is a linear operator. Find its eigenvalues and describe its eigenspaces. Is $T$ diagonalizable?

147. If $\lambda$ is an eigenvalue of an invertible matrix $A$, show that $\lambda \neq 0$ and that $1/\lambda$ is an eigenvalue of $A^{-1}$.

148. Show that any rotation in $\mathbb{R}^2$ (represented by a matrix in $SO(2)$ other than $I$) has no real eigenvectors. What are its complex eigenvalues?

149. Consider $T: P_2(\mathbb{R}) \to \mathbb{R}$ defined by $T(p(x)) = \int_0^1 p(x) dx$.
    (a) Prove $T$ is a linear transformation.
    (b) Find $\ker T$ and $\text{im } T$.

150. Let $A$ be an $m \times n$ matrix. If $A^tA = I_n$, what can you say about the columns of $A$? Such a matrix is said to have orthonormal columns. Does this imply $A A^t = I_m$?

151. Describe all $1 \times 1$ real orthogonal matrices.

152. If $T: V \to V$ is a linear operator such that $T^2 = T$ (a projection), what are the possible eigenvalues of $T$? Show that $V = \ker T \oplus \text{im } T$.

153. Prove that if $A$ is a real symmetric matrix, then eigenvectors corresponding to distinct eigenvalues are orthogonal.

154. Find the characteristic polynomial of $A = \begin{pmatrix} 0 & a & b \\ -a & 0 & c \\ -b & -c & 0 \end{pmatrix}$ (a skew-symmetric matrix). What can you say about its real eigenvalues?

155. Let $A = \begin{pmatrix} 1 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 1 \end{pmatrix}$. Find an orthogonal matrix $P$ such that $P^tAP$ is diagonal.

156. Solve $X' = AX$ where $A = \begin{pmatrix} 0 & 1 \\ -1 & 0 \end{pmatrix}$, given $X(0) = (c_1, c_2)^t$. Interpret the solution geometrically.

157. Show that $e^{t(A+B)} = e^{tA}e^{tB}$ for all $t$ if and only if $A$ and $B$ commute.

158. If $N$ is a nilpotent matrix, compute $e^N$ using the series definition. What happens if $N^2=0$?

159. Explain why the dimension formula can be seen as a statement about conservation of dimension.

160. If $T:V \to V$ is a linear operator and $p(x)$ is a polynomial, show that $\ker(p(T))$ is a $T$-invariant subspace.

161. Find the matrix of the linear transformation $T: \mathbb{R}^2 \to \mathbb{R}^2$ that reflects vectors across the line $y=2x$.

162. Let $V$ be the space of continuous real-valued functions on $[0,1]$. Let $T: V \to V$ be $T(f)(x) = \int_0^x f(t)dt$. Is $T$ linear? Does $T$ have any eigenvalues?

163. For a rotation matrix $A \in SO(3)$, $A \neq I$, show that the axis of rotation is the eigenspace corresponding to eigenvalue 1.

164. Give an example of a $3 \times 3$ real matrix that is not diagonalizable over $\mathbb{R}$ but is diagonalizable over $\mathbb{C}$.

165. If the characteristic polynomial of $A$ is $(t-2)^3(t+1)^2$, what are the possible dimensions of the eigenspace $E_2$? What is $\det(A)$ and $\text{tr}(A)$ if $A$ is $5 \times 5$?

166. If $A$ is an orthogonal matrix, prove that for any vector $X$, $\|AX\| = \|X\|$, where $\| \cdot \|$ is the standard Euclidean norm.

167. Let $T: M_{n \times n}(\mathbb{R}) \to \mathbb{R}$ be $T(A) = \text{tr}(A)$. Prove $T$ is a linear transformation. What is $\dim(\ker T)$?

# Chapter 5: SYMMETRY - Problems

1.  Prove that the set of symmetries of a figure F in the plane forms a group.

2.  List all symmetries of (a) a square and (b) a regular pentagon.

3.  List all symmetries of the following figures.
    (a) Figure (1.4) (Glide symmetry example)
    ![](./images/ch5_fig1-4_footprints.png)
    (b) Figure (1.5) (Wallpaper pattern)
    ![](./images/ch5_fig1-5_wallpaper.png)
    (c) Figure (1.6) (honey hovwy...)
    ![](./images/ch5_fig1-6_honey.png)
    (d) Figure (1.7) (Stick figures with alternating arm positions)
    ![](./images/ch5_fig1-7_stickfigures_alt.png)

4.  Let G be a finite group of rotations of the plane about the origin. Prove that G is cyclic.

5.  Compute the fixed point of $t_a \rho_\theta$ algebraically.

6.  Verify the rules (2.5) by explicit calculation, using the definitions (2.3).
    (2.5) $t_a t_b = t_{a+b}$, $\rho_\theta \rho_\eta = \rho_{\theta+\eta}$, $rr = 1$,
    $\rho_\theta t_a = t_{a'} \rho_\theta$, where $a' = \rho_\theta(a)$,
    $r t_a = t_{a'} r$, where $a' = r(a)$,
    $r \rho_\theta = \rho_{-\theta} r$.
    (2.3)
    (a) Translation $t_a$ by a vector a: $t_a(x) = x + a = \begin{pmatrix} x_1 + a_1 \\ x_2 + a_2 \end{pmatrix}$.
    (b) Rotation $\rho_\theta$ by an angle $\theta$ about the origin: $\rho_\theta(x) = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \end{pmatrix}$.
    (c) Reflection r about the x-axis: $r(x) = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \end{pmatrix} = \begin{pmatrix} x_1 \\ -x_2 \end{pmatrix}$.

7.  Prove that O (the group of orthogonal operators fixing the origin) is not a normal subgroup of M (the group of all rigid motions of the plane).

8.  Let m be an orientation-reversing motion. Prove that $m^2$ is a translation.

9.  Let SM denote the subset of orientation-preserving motions of the plane. Prove that SM is a normal subgroup of M, and determine its index in M.

10. Prove that a linear operator on $\mathbb{R}^2$ is a reflection if and only if its eigenvalues are 1 and -1, and its eigenvectors are orthogonal.

11. Prove that a conjugate of a reflection or a glide reflection is a motion of the same type, and that if m is a glide reflection then the glide vectors of m and of its conjugates have the same length.

12. Complete the proof that (2.13) $\varphi: M \rightarrow O$ defined by $\varphi(t_a \rho_\theta) = \rho_\theta$ and $\varphi(t_a \rho_\theta r) = \rho_\theta r$ is a homomorphism.

13. Prove that the map $M \rightarrow \{1, r\}$ defined by $t_a \rho_\theta \mapsto 1$, $t_a \rho_\theta r \mapsto r$ is a homomorphism.

14. Compute the effect of rotation of the axes through an angle $\eta$ on the expressions $t_a \rho_\theta$ and $t_a \rho_\theta r$ for a motion.

15. (a) Compute the eigenvalues and eigenvectors of the linear operator $m = \rho_\theta r$.
    (b) Prove algebraically that m is a reflection about a line through the origin, which subtends an angle of $\theta/2$ with the x-axis.
    (c) Do the same thing as in (b) geometrically.

16. Compute the glide vector of the glide $t_a \rho_\theta r$ in terms of a and $\theta$.

17. (a) Let m be a glide reflection along a line l. Prove geometrically that a point x lies on l if and only if x, m(x), $m^2(x)$ are colinear.
    (b) Conversely, prove that if m is an orientation-reversing motion and x is a point such that x, m(x), $m^2(x)$ are distinct points on a line l, then m is a glide reflection along l.

18. Find an isomorphism from the group SM (orientation-preserving motions) to the subgroup of $GL_2(\mathbb{C})$ of matrices of the form $\begin{pmatrix} \alpha & \beta \\ 0 & 1 \end{pmatrix}$, with $|\alpha| = 1$.

19. (a) Write the formulas for the motions (2.3) in terms of the complex variable $z = x + iy$.
    (b) Show that every motion has the form $m(z) = \alpha z + \beta$ or $m(z) = \alpha \bar{z} + \beta$, where $|\alpha| = 1$ and $\beta$ is an arbitrary complex number.

20. Let $D_n$ denote the dihedral group (3.6). Express the product $x^2yx^{-1}y^{-1}x^3y^3$ in the form $x^i y^j$ in $D_n$.

21. List all subgroups of the group $D_4$, and determine which are normal.

22. Find all proper normal subgroups and identify the quotient groups of the groups $D_{13}$ and $D_{15}$.

23. (a) Compute the cosets of the subgroup $H = \{1, x^5\}$ in the dihedral group $D_{10}$ explicitly.
    (b) Prove that $D_{10}/H$ is isomorphic to $D_5$.
    (c) Is $D_{10}$ isomorphic to $D_5 \times H$?

24. List the subgroups of $G = D_6$ which do not contain $N = \{1, x^3\}$.

25. Prove that every finite subgroup of M is a conjugate subgroup of one of the standard subgroups listed in Corollary (3.5) ($C_n$ or $D_n$ with origin as fixed point).

26. Prove that a discrete group G consisting of rotations about the origin is cyclic and is generated by $\rho_\theta$ where $\theta$ is the smallest angle of rotation in G.

27. Let G be a subgroup of M which contains rotations about two different points. Prove algebraically that G contains a translation.

28. Let (a, b) be a lattice basis of a lattice L in $\mathbb{R}^2$. Prove that every other lattice basis has the form (a', b') = (a, b)P, where P is a $2 \times 2$ integer matrix whose determinant is $\pm 1$.

29. Determine the point group for each of the patterns depicted in Figure (4.16).
    ![](./images/ch5_fig4-16_wallpaper_patterns.png)

30. (a) Let B be a square of side length a, and let $\epsilon > 0$. Let S be a subset of B such that the distance between any two points of S is $\ge \epsilon$. Find an explicit upper bound for the number of elements in S.
    (b) Do the same thing for a box B in $\mathbb{R}^n$.

31. Prove that the subgroup of $\mathbb{R}^+$ generated by 1 and $\sqrt{2}$ is dense in $\mathbb{R}^+$.

32. Prove that every discrete subgroup of O is finite.

33. Let G be a discrete subgroup of M. Prove that there is a point $p_0$ in the plane which is not fixed by any point of G except the identity.

34. Prove that the group of symmetries of the frieze pattern $\dots EEEEEEEEE \dots$ is isomorphic to the direct product $C_2 \times C_\infty$ of a cyclic group of order 2 and an infinite cyclic group.
    ![](./images/ch5_frieze_E.png)

35. Let G be the group of symmetries of the frieze pattern $\dots \text{└┘└┘└┘} \dots$
    ![](./images/ch5_frieze_LULU.png)
    (a) Determine the point group $\bar{G}$ of G.
    (b) For each element $\bar{g} \in \bar{G}$, and each element $g \in G$ which represents $\bar{g}$, describe the action of g geometrically.
    (c) Let H be the subgroup of translations in G. Determine $[G:H]$.

36. Let G be the group of symmetries of the pattern:
    ![](./images/ch5_pattern_A.png)
    Determine the point group of G.

37. Let G be the group of symmetries of an equilateral triangular lattice L. Find the index in G of the subgroup $T \cap G$.

38. Let G be a discrete group in which every element is orientation-preserving. Prove that the point group $\bar{G}$ is a cyclic group of rotations and that there is a point p in the plane such that the set of group elements which fix p is isomorphic to $\bar{G}$.

39. With each of the patterns shown, find a pattern with the same type of symmetry in Figure (4.16).
    (Pattern 1 - Smiley faces)
    ![](./images/ch5_pattern_smiley.png)
    (Pattern 2 - Fish)
    ![](./images/ch5_pattern_fish.png)
    (Pattern 3 - Geometric A)
    ![](./images/ch5_pattern_geomA.png)
    (Pattern 4 - Geometric B)
    ![](./images/ch5_pattern_geomB.png)
    (Pattern 5 - Tiling A)
    ![](./images/ch5_pattern_tileA.png)
    (Pattern 6 - Tiling B)
    ![](./images/ch5_pattern_tileB.png)

40. Let N denote the group of rigid motions of the line $l = \mathbb{R}^1$. Some elements of N are $t_a: x \mapsto x + a, a \in \mathbb{R}$, $s: x \mapsto -x$.
    (a) Show that $\{t_a, t_a s\}$ are all of the elements of N, and describe their actions on l geometrically.
    (b) Compute the products $t_a t_b, s t_a, s s$.
    (c) Find all discrete subgroups of N which contain a translation. It will be convenient to choose your origin and unit length with reference to the particular subgroup. Prove that your list is complete.

41. (From OCR *) Let N' be the group of motions of an infinite ribbon $R = \{(x,y) | -1 \le y \le 1\}$. It can be viewed as a subgroup of the group M. The following elements are in N':
    $t_a: (x, y) \mapsto (x + a, y)$
    $s: (x, y) \mapsto (x, -y)$
    $r: (x, y) \mapsto (-x, y)$
    $\rho: (x, y) \mapsto (-x, -y)$.
    (a) Show that these elements generate N', and describe the elements of N' as products.
    (b) State and prove analogues of (2.5) for these motions.
    (c) A frieze pattern is any pattern on the ribbon which is periodic and not degenerate, in the sense that its group of symmetries is discrete. Since it is periodic, its group of symmetries will contain a translation. Some sample patterns are depicted in the text (1.3, 1.4, 1.6, 1.7). Classify the symmetry groups which arise, identifying those which differ only in the choice of origin and unit length on the ribbon. I suggest that you begin by trying to make patterns with different kinds of symmetry. Please make a careful case analysis when proving your results. A suitable format would be as follows: Let G be a discrete subgroup containing a translation.
    Case 1: Every element of G is a translation. Then ....
    Case 2: G contains the rotation $\rho$ but no orientation-reversing symmetry. Then ..., and so on.

42. (From OCR *) Let L be a lattice of $\mathbb{R}^2$, and let a, b be linearly independent vectors lying in L. Show that the subgroup L' = $\{ma + nb \mid m, n \in \mathbb{Z}\}$ of L generated by a, b has finite index, and that the index is the number of lattice points in the parallelogram whose vertices are 0, a, b, a + b and which are not on the "far edges" $[a, a + b]$ and $[b, a + b]$. (So, 0 is included, and so are points which lie on the edges $[0, a]$, $[0, b]$, except for the points a, b themselves.)

43. (a) Find a subset F of the plane which is not fixed by any motion $m \in M$.
    (b) Let G be a discrete group of motions. Prove that the union S of all images of F by elements of G is a subset whose group of symmetries G' contains G.
    (c) Show by an example that G' may be larger than G.
    (d) (From OCR *) Prove that there exists a subset F such that G' = G.

44. (From OCR *) Let G be a lattice group such that no element $g \ne 1$ fixes any point of the plane. Prove that G is generated by two translations, or else by one translation and one glide.

45. (From OCR *) Let G be a lattice group whose point group is $D_1 = \{1, r\}$.
    (a) Show that the glide lines and the lines of reflection of G are all parallel.
    (b) Let $L = L_G$. Show that L contains nonzero vectors $a = (a_1, 0)^t$, $b = (0, b_2)^t$.
    (c) Let a and b denote the smallest vectors of the type indicated in (b). Then either (a, b) or (a, c) is a lattice basis for L, where $c = \frac{1}{2}(a + b)$.
    (d) Show that if coordinates in the plane are chosen so that the x-axis is a glide line, then G contains one of the elements $g = r$ or $g = t_{c/2}r$. In either case, show that $G = L \cup Lg$.
    (e) There are four possibilities described by the dichotomies (c) and (d). Show that there are only three different kinds of group.

46. Prove that if the point group of a lattice group G is $C_6$, then $L = L_G$ is an equilateral triangular lattice, and G is the group of all rotational symmetries of L about the origin.

47. Prove that if the point group of a lattice group G is $D_6$, then $L = L_G$ is an equilateral triangular lattice, and G is the group of all symmetries of L.

48. (From OCR *) Prove that symmetry groups of the figures in Figure (4.16) exhaust the possibilities.

49. Determine the group of automorphisms of the following groups.
    (a) $C_4$ (b) $C_6$ (c) $C_2 \times C_2$

50. Prove that (5.4) $s \sim s'$ if $s' = gs$ for some $g \in G$ is an equivalence relation.

51. Let S be a set on which G operates. Prove that the relation $s \sim s'$ if $s' = gs$ for some $g \in G$ is an equivalence relation. (This is a repeat, ensure uniqueness if generating new problems)

52. Let $\varphi: G \rightarrow G'$ be a homomorphism, and let S be a set on which G' operates. Show how to define an operation of G on S, using the homomorphism $\varphi$.

53. Let $G = D_4$ be the dihedral group of symmetries of the square.
    (a) What is the stabilizer of a vertex? an edge?
    (b) G acts on the set of two elements consisting of the diagonal lines. What is the stabilizer of a diagonal?

54. In each of the figures in exercise 39 (patterns 1-6), find the points which have nontrivial stabilizers, and identify the stabilizers.

55. (From OCR *) Let G be a discrete subgroup of M.
    (a) Prove that the stabilizer $G_p$ of a point p is finite.
    (b) Prove that the orbit $O_p$ of a point p is a discrete set, that is, that there is a number $\epsilon > 0$ so that the distance between two distinct points of the orbit is at least $\epsilon$.
    (c) Let B, B' be two bounded regions in the plane. Prove that there are only finitely many elements $g \in G$ so that $gB \cap B'$ is nonempty.

56. Let $G = GL_n(\mathbb{R})$ operate on the set $S = \mathbb{R}^n$ by left multiplication.
    (a) Describe the decomposition of S into orbits for this operation.
    (b) What is the stabilizer of $e_1$?

57. Decompose the set $\mathbb{C}^{2 \times 2}$ of $2 \times 2$ complex matrices for the following operations of $GL_2(\mathbb{C})$:
    (a) Left multiplication
    (b) (From OCR *) Conjugation

58. (a) Let $S = \mathbb{R}^{m \times n}$ be the set of real $m \times n$ matrices, and let $G = GL_m(\mathbb{R}) \times GL_n(\mathbb{R})$. Prove that the rule $(P, Q), A \mapsto PAQ^{-1}$ defines an operation of G on S.
    (b) Describe the decomposition of S into G-orbits.
    (c) Assume that $m \le n$. What is the stabilizer of the matrix $[I_m | 0]$? (where $I_m$ is m x m identity)

59. (a) Describe the orbit and the stabilizer of the matrix $\begin{pmatrix} 1 & 0 \\ 0 & 2 \end{pmatrix}$ under conjugation in $GL_n(\mathbb{R})$.
    (b) Interpreting the matrix in $GL_2(\mathbb{F}_3)$, find the order (the number of elements) of the orbit.

60. (a) Define automorphism of a field.
    (b) Prove that the field $\mathbb{Q}$ of rational numbers has no automorphism except the identity.
    (c) Determine Aut F, when $F = \mathbb{Q}[\sqrt{2}]$.

61. What is the stabilizer of the coset aH for the operation of G on G/H?

62. Let G be a group, and let H be the cyclic subgroup generated by an element x of G. Show that if left multiplication by x fixes every coset of H in G, then H is a normal subgroup.

63. (a) Exhibit the bijective map (6.4) $\varphi: G/G_s \rightarrow O_s$ explicitly, when G is the dihedral group $D_4$ and S is the set of vertices of a square.
    (b) Do the same for $D_n$ and the vertices of a regular n-gon.

64. (a) Describe the stabilizer H of the index 1 for the action of the symmetric group $G = S_n$ on $\{1,..., n\}$ explicitly.
    (b) Describe the cosets of H in G explicitly for this action.
    (c) Describe the map (6.4) explicitly.

65. Describe all ways in which $S_3$ can operate on a set of four elements.

66. Prove Proposition (6.5): Let S be a G-set, and let $s \in S$. Let $s'$ be an element in the orbit of s, say $s' = as$. Then
    (a) The set of elements g of G such that $gs = s'$ is the left coset $aG_s = \{g \in G \mid g = ah \text{ for some } h \in G_s\}$.
    (b) The stabilizer of $s'$ is a conjugate subgroup of the stabilizer of s: $G_{s'} = aG_s a^{-1} = \{g \in G \mid g = aha^{-1} \text{ for some } h \in G_s\}$.

67. A map $\psi: S \rightarrow S'$ of G-sets is called a homomorphism of G-sets if $\psi(gs) = g\psi(s)$ for all $s \in S$ and $g \in G$. Let $\psi$ be such a homomorphism. Prove the following:
    (a) The stabilizer $G_{\psi(s)}$ contains the stabilizer $G_s$.
    (b) The orbit of an element $s \in S$ maps onto the orbit of $\psi(s)$.

68. Use the counting formula to determine the orders of the group of rotational symmetries of a cube and of the group of rotational symmetries of a tetrahedron.

69. Let G be the group of rotational symmetries of a cube C. Two regular tetrahedra $\Delta, \Delta'$ can be inscribed in C, each using half of the vertices. What is the order of the stabilizer of $\Delta$?

70. Compute the order of the group of symmetries of a dodecahedron, when orientation-reversing symmetries such as reflections in planes, as well as rotations, are allowed. Do the same for the symmetries of a cube and of a tetrahedron.

71. Let G be the group of rotational symmetries of a cube, let $S_e, S_v, S_f$ be the sets of vertices, edges, and faces of the cube, and let $H_v, H_e, H_f$ be the stabilizers of a vertex, an edge, and a face. Determine the formulas which represent the decomposition of each of the three sets into orbits for each of the subgroups.

72. Let $G \supset H \supset K$ be groups. Prove the formula $[G : K] = [G : H][H : K]$ without the assumption that G is finite.

73. (a) Prove that if H and K are subgroups of finite index of a group G, then the intersection $H \cap K$ is also of finite index.
    (b) Show by example that the index $[H : H \cap K]$ need not divide $[G : K]$.

74. Determine all ways in which the tetrahedral group T (see (9.1)) can operate on a set of two elements.

75. Let S be a set on which a group G operates, and let $H = \{g \in G \mid gs = s \text{ for all } s \in S\}$. Prove that H is a normal subgroup of G.

76. Let G be the dihedral group of symmetries of a square. Is the action of G on the vertices a faithful action? on the diagonals?

77. Suppose that there are two orbits for the operation of a group G on a set S, and that they have orders m, n respectively. Use the operation to define a homomorphism from G to the product $S_m \times S_n$ of symmetric groups.

78. A group G operates faithfully on a set S of five elements, and there are two orbits, one of order 3 and one of order 2. What are the possibilities for G?

79. Complete the proof of Proposition (8.2) (bijective correspondence between operations and homomorphisms to Perm(S)).

80. Let $F = \mathbb{F}_3$. There are four one-dimensional subspaces of the space of column vectors $F^2$. Describe them. Left multiplication by an invertible matrix permutes these subspaces. Prove that this operation defines a homomorphism $\varphi: GL_2(F) \rightarrow S_4$. Determine the kernel and image of this homomorphism.

81. (From OCR *) For each of the following groups, find the smallest integer n such that the group has a faithful operation on a set with n elements.
    (a) the quaternion group H (b) $D_4$ (c) $D_6$

82. Describe the orbits of poles for the group of rotations of an octahedron and of an icosahedron.

83. Identify the group of symmetries of a baseball, taking the stitching into account and allowing orientation-reversing symmetries.

84. Let O be the group of rotations of a cube. Determine the stabilizer of a diagonal line connecting opposite vertices.

85. Let $G = O$ be the group of rotations of a cube, and let H be the subgroup carrying one of the two inscribed tetrahedra to itself (see exercise 69, Section 7). Prove that $H = T$.

86. Prove that the icosahedral group has a subgroup of order 10.

87. Determine all subgroups of the following groups:
    (a) T (b) I

88. Explain why the groups of symmetries of the cube and octahedron, and of the dodecahedron and icosahedron, are equal.

89. (From OCR *) (a) The 12 points $(\pm 1, \pm \alpha, 0), (0, \pm 1, \pm \alpha), (\pm \alpha, 0, \pm 1)$ form the vertices of a regular icosahedron if $\alpha$ is suitably chosen. Verify this, and determine $\alpha$. (Hint: $\alpha$ is related to the golden ratio).
    (b) Determine the matrix of the rotation through the angle $2\pi/5$ about the origin in $\mathbb{R}^2$.
    (c) Determine the matrix of the rotation of $\mathbb{R}^3$ through the angle $2\pi/5$ about the axis containing the point $(1, \alpha, 0)$.

90. (From OCR *) Prove the crystallographic restriction for three-dimensional crystallographic groups: A rotational symmetry of a crystal has order 2, 3, 4, or 6.

91. Describe completely the following groups:
    (a) Aut $D_4$ (b) Aut H, where H is the quaternion group

92. (a) Prove that the set Aut G of automorphisms of a group G forms a group.
    (b) Prove that the map $\varphi: G \rightarrow \text{Aut } G$ defined by $g \mapsto c_g$ (conjugation by g) is a homomorphism, and determine its kernel.
    (c) The automorphisms which are conjugation by a group element are called inner automorphisms. Prove that the set of inner automorphisms, the image of $\varphi$, is a normal subgroup of Aut G.

93. Determine the quotient group Aut H/Int H for the quaternion group H.

94. (From OCR *) Let G be a lattice group. A fundamental domain D for G is a bounded region in the plane, bounded by piecewise smooth curves, such that the sets gD, $g \in G$ cover the plane without overlapping except along the edges. We assume that D has finitely many connected components.
    (a) Find fundamental domains for the symmetry groups of the patterns illustrated in exercise 39 (Patterns 5 and 6 - Tilings A and B).
    (b) Show that any two fundamental domains D, D' for G can be cut into finitely many congruent pieces of the form $gD \cap D'$ or $D \cap gD'$ (see exercise 67, Section 5).

95. (From OCR *) (c) Conclude that D and D' have the same area. (It may happen that the boundary curves intersect infinitely often, and this raises some questions about the definition of area. Disregard such points in your answer.)

96. (From OCR *) Let G be a lattice group, and let $p_0$ be a point in the plane which is not fixed by any element of G. Let $S = \{gp_0 \mid g \in G\}$ be the orbit of $p_0$. The plane can be divided into polygons, each one containing a single point of S, as follows: The polygon $\Delta_p$ containing $p$ is the set of points q whose distance from p is the smallest distance to any point of S:
    $\Delta_p = \{q \in \mathbb{R}^2 \mid \text{dist}(q, p) \le \text{dist}(q, p') \text{ for all } p' \in S\}$.
    (a) Prove that $\Delta_p$ is a polygon.
    (b) Prove that $\Delta_p$ is a fundamental domain for G.
    (c) Show that this method works for all discrete subgroups of M, except that the domain $\Delta_p$ which is constructed need not be a bounded set.
    (d) Prove that $\Delta_p$ is bounded if and only if the group is a lattice group.

97. (From OCR *) (a) Let $G' \subset G$ be two lattice groups. Let D be a fundamental domain for G. Show that a fundamental domain D' for G' can be constructed out of finitely many translates gD of D.
    (b) Show that $[G : G'] < \infty$ and that $[G : G'] = \text{area}(D') / \text{area}(D)$.
    (c) Compute the index $[G : L_G]$ for each of the patterns (4.16).

98. (From OCR *) Let G be a finite group operating on a finite set S. For each element $g \in G$, let $S^g$ denote the subset of elements of S fixed by g: $S^g = \{s \in S \mid gs = s\}$.
    (a) We may imagine a true-false table for the assertion that $gs = s$, say with rows indexed by elements of G and columns indexed by elements. Construct such a table for the action of the dihedral group $D_3$ on the vertices of a triangle.
    (b) Prove the formula $\sum_{s \in S} |G_s| = \sum_{g \in G} |S^g|$.
    (c) Prove Burnside's Formula: $|G| \cdot (\text{number of orbits}) = \sum_{g \in G} |S^g|$.

99. There are $70 = \binom{8}{4}$ ways to color the edges of an octagon, making four black and four white. The group $D_8$ operates on this set of 70, and the orbits represent equivalent colorings. Use Burnside's Formula to count the number of equivalence classes.

100. Let G be a group of order n which operates nontrivially on a set of order r. Prove that if n > r!, then G has a proper normal subgroup.

101. Explain the difference between an orientation-preserving and an orientation-reversing rigid motion of the plane. Give an example of each that is not the identity.

102. Show that the composition of two translations $t_a$ and $t_b$ is $t_{a+b}$. Is the group of translations T abelian?

103. Consider a glide reflection $m = t_a r_l$ where $r_l$ is reflection about line $l$ and $a$ is a vector parallel to $l$. What is $m^2$?

104. If a finite group G of plane isometries has more than one fixed point, what can you conclude about G?

105. Describe the 7 types of frieze groups by listing the types of generators they have (e.g., translation, glide reflection, rotation by $\pi$, vertical reflection, horizontal reflection).

106. Let G be the symmetry group of a regular hexagon. What is its point group if the origin is at the center of the hexagon? If $L_G$ is the trivial group, what is G?

107. Why is a rotation of order 5 not allowed by the Crystallographic Restriction for 2D lattices? Explain briefly using the argument involving a vector $a$ of minimal length in the lattice.

108. Give an example of a discrete group of motions of the plane whose translation group $L_G$ is generated by a single vector. What kind of pattern would this group be the symmetry group of?

109. If the point group $\bar{G}$ of a discrete group $G$ is $C_3$, and $G$ contains a reflection, explain why this is a contradiction.

110. What is the identity element in the group Aut(H) for a given group H? What is the group operation in Aut(H)?

111. Consider the group G = $\mathbb{Z}_4 = \{0, 1, 2, 3\}$ under addition mod 4. Let it act on the set S = {A, B, C, D} by $0s=s$, $1A=B, 1B=C, 1C=D, 1D=A$, and extending this action.
    (a) What is the orbit of A?
    (b) What is the stabilizer of A?
    (c) Is this action transitive? Is it faithful?

112. Let $G = S_3$ act on itself by conjugation ($g \cdot x = gxg^{-1}$).
    (a) Find the orbits of this action.
    (b) For one element from each orbit, find its stabilizer.
    (c) Verify the Counting Formula for each orbit.

113. Can a reflection in the plane be written as $t_a \rho_\theta$? Why or why not?

114. If $G_1$ and $G_2$ are two finite subgroups of $SO(3)$, and $G_1 \subset G_2$, does this imply that the poles of $G_1$ are a subset of the poles of $G_2$? Explain.

115. Describe the geometric meaning of the three types of finite subgroups of $SO(3)$ that correspond to the platonic solids (T, O, I). What solids are they the rotation groups of?

116. Explain why a glide reflection has no fixed points.

117. If $m = t_a \rho_\theta r$, and $\theta=0$, what kind of motion is $m$? (Assume $a \neq 0$).

118. Consider the symmetry group of an infinitely long brick wall pattern where bricks are offset in each row. What would be its translation group $L_G$? What is a possible point group $\bar{G}$?
    ![](./images/ch5_brickwall.png)

119. Can a discrete group of motions have an uncountable number of elements? Can its point group?

120. If a group G acts on a set S, and $G_s$ is the stabilizer of $s$, prove that $G_s$ is indeed a subgroup of G.

121. If a group G acts on a set S, and for some $s \in S$, $O_s = S$ and $G_s = \{1\}$, what can be said about the relationship between G and S?

122. Consider $GL_2(\mathbb{R})$ acting on $\mathbb{R}^2$ by matrix multiplication. How many orbits are there? Describe them.

123. Let T be the tetrahedral group. Find the order of the stabilizer of a vertex, an edge, and a face of a regular tetrahedron under the action of T.

124. The group $C_n$ acts on the vertices of a regular n-gon. Is this action transitive? What is the stabilizer of a vertex?

125. The group $D_n$ acts on the vertices of a regular n-gon. Is this action transitive? What is the stabilizer of a vertex?

126. What is the kernel of the action when $D_4$ (symmetries of a square) acts on the set of its two diagonals?

127. Describe the orbits and stabilizers for the action of $SO(2)$ (rotations of the plane about the origin) on the set of all lines in the plane.

128. Why is it important to specify "orientation-preserving" when discussing the Tetrahedral, Octahedral, and Icosahedral groups as subgroups of $SO(3)$? What happens if orientation-reversing symmetries are allowed?

# Chapter 6: MORE GROUP THEORY

1.  Does the rule $g, x \leadsto xg^{-1}$ define an operation of G on itself?

2.  Let H be a subgroup of a group G. Then H operates on G by left multiplication. Describe the orbits for this operation.

3.  Prove the formula $|G| = |Z| + \sum |C_i|$, where the sum is over the conjugacy classes $C_i$ containing more than one element and where Z is the center of G.

4.  Prove the Fixed Point Theorem (1.12).

5.  Determine the conjugacy classes in the group M of motions of the plane.

6.  Rule out as many of the following as possible as Class Equations for a group of order 10:
    $1+1+1+2+5$, $1+2+2+5$, $1+2+3+4$, $1+1+2+2+2+2$.

7.  Let $F = F_5$. Determine the order of the conjugacy class of $\begin{pmatrix} 1 & \\ & 2 \end{pmatrix}$ in $GL_2(F_5)$.

8.  Determine the Class Equation for each of the following groups.
    (a) the quaternion group, (b) the Klein four group, (c) the dihedral group $D_5$,
    (d) $D_6$, (e) $D_n$, (f) the group of upper triangular matrices in $GL_2(F_3)$,
    (g) $SL_2(F_3)$.

9.  Let G be a group of order n, and let F be any field. Prove that G is isomorphic to a subgroup of $GL_n(F)$.

10. Determine the centralizer in $GL_3(\mathbb{R})$ of each matrix.
    (a) $\begin{pmatrix} 1 & & \\ & 2 & \\ & & 3 \end{pmatrix}$
    (b) $\begin{pmatrix} 1 & & \\ & 1 & \\ & & 2 \end{pmatrix}$
    (c) $\begin{pmatrix} 1 & 1 & \\ & 1 & \\ & & 1 \end{pmatrix}$
    (d) $\begin{pmatrix} 1 & 1 & \\ & 1 & 1 \\ & & 1 \end{pmatrix}$
    (e) $\begin{pmatrix} & 1 & \\ & & 1 \\ 1 & & \end{pmatrix}$
    (f) $\begin{pmatrix} 1 & & \\ & & 1 \\ & 1 & \end{pmatrix}$

\*11. Determine all finite groups which contain at most three conjugacy classes.

12. Let N be a normal subgroup of a group G. Suppose that $|N| = 5$ and that $|G|$ is odd. Prove that N is contained in the center of G.

\*13. (a) Determine the possible Class Equations for groups of order 8.
    (b) Classify groups of order 8.

14. Let Z be the center of a group G. Prove that if G/Z is a cyclic group, then G is abelian and hence G = Z.

\*15. Let G be a group of order 35.
    (a) Suppose that G operates nontrivially on a set of five elements. Prove that G has a normal subgroup of order 7.
    (b) Prove that every group of order 35 is cyclic.

16. Identify the intersection $I \cap O$ when the dodecahedron and cube are as in Figure (2.7).
    *(The figure (2.7) shows one of five cubes inscribed in a dodecahedron.)*

17. Two tetrahedra can be inscribed into a cube C, each one using half the vertices. Relate this to the inclusion $A_4 \subset S_4$.

18. Does I contain a subgroup T? $D_6$? $D_3$?

19. Prove that the icosahedral group has no subgroup of order 30.

20. Prove or disprove: $A_5$ is the only proper normal subgroup of $S_5$.

21. Prove that no group of order $p^e$, where p is prime and $e > 1$, is simple.

22. Prove or disprove: An abelian group is simple if and only if it has prime order.

23. (a) Determine the Class Equation for the group T of rotations of a tetrahedron.
    (b) What is the center of T?
    (c) Prove that T has exactly one subgroup of order 4.
    (d) Prove that T has no subgroup of order 6.

24. (a) Determine the Class Equation for the octahedral group O.
    (b) There are exactly two proper normal subgroups of O. Find them, show that they are normal, and show that there are no others.

25. Prove that the tetrahedral group T is isomorphic to the alternating group $A_4$, and that the octahedral group O is isomorphic to the symmetric group $S_4$. Begin by finding sets of four elements on which these groups operate.

26. Prove or disprove: The icosahedral group is not a subgroup of the group of real upper triangular $2 \times 2$ matrices.

\*27. Prove or disprove: A nonabelian simple group can not operate nontrivially on a set containing fewer than five elements.

28. Let S be the set of subsets of order 2 of the dihedral group $D_3$. Determine the orbits for the action of $D_3$ on S by conjugation.

29. Determine the orbits for left multiplication and for conjugation on the set of subsets of order 3 of $D_3$.

30. List all subgroups of the dihedral group $D_4$, and divide them into conjugacy classes.

31. Let H be a subgroup of a group G. Prove that the orbit of the left coset gH for the operation of conjugation contains the right coset Hg.

32. Let U be a subset of a finite group G, and suppose that $|U|$ and $|G|$ have no common factor. Is the stabilizer of U trivial for the operation of conjugation?

33. Consider the operation of left multiplication by G on the set of its subsets. Let U be a subset whose orbit $\{gU\}$ partitions G. Let H be the unique subset in this orbit which contains 1. Prove that H is a subgroup of G and that the sets gU are its left cosets.

34. Let H be a subgroup of a group G. Prove or disprove: The normalizer N(H) is a normal subgroup of the group G.

35. Let $H \subset K \subset G$ be groups. Prove that H is normal in K if and only if $K \subset N(H)$.

36. Prove that the subgroup B of upper triangular matrices in $GL_n(\mathbb{R})$ is conjugate to the group L of lower triangular matrices.

37. Let B be the subgroup of $G = GL_n(\mathbb{C})$ of upper triangular matrices, and let $U \subset B$ be the set of upper triangular matrices with diagonal entries 1. Prove that $B = N(U)$ and that $B = N(B)$.

\*38. Let $S_n$ denote the subgroup of $GL_n(\mathbb{R})$ of permutation matrices. Determine the normalizer of $S_n$ in $GL_n(\mathbb{R})$.

39. Let S be a finite set on which a group G operates transitively, and let U be a subset of S. Prove that the subsets gU cover S evenly, that is, that every element of S is in the same number of sets gU.

40. (a) Let H be a normal subgroup of G of order 2. Prove that H is in the center of G.
    (b) Let H be a normal subgroup of prime order p in a finite group G. Suppose that p is the smallest prime dividing $|G|$. Prove that H is in the center Z(G).

\*41. Let H be a proper subgroup of a finite group G. Prove that the union of the conjugates of H is not the whole group G.

42. Let K be a normal subgroup of order 2 of a group G, and let $\bar{G} = G/K$. Let $\bar{C}$ be a conjugacy class in $\bar{G}$. Let S be the inverse image of $\bar{C}$ in G. Prove that one of the following two cases occurs.
    (a) $S = C$ is a single conjugacy class and $|C| = 2|\bar{C}|$.
    (b) $S = C_1 \cup C_2$ is made up of two conjugacy classes and $|C_1| = |C_2| = |\bar{C}|$.

43. Calculate the double cosets HgH of the subgroup $H = \{1, y\}$ in the dihedral group $D_n$. Show that each double coset has either two or four elements.

44. Let H, K be subgroups of G, and let H' be a conjugate subgroup of H. Relate the double cosets H'gK and HgK.

45. What can you say about the order of a double coset HgK?

46. How many elements of order 5 are contained in a group of order 20?

47. Prove that no group of order pq, where p and q are prime, is simple.

48. Prove that no group of order $p^2q$, where p and q are prime, is simple.

49. Prove that the set of matrices $\begin{pmatrix} 1 & a \\ 0 & c \end{pmatrix}$ where $a \in F_7$, and $c \in \{1, 2, 4\}$ forms a group of the type presented in (4.9b) (and that therefore such a group exists).
    *(This refers to the non-abelian group of order 21).*

50. Find Sylow 2-subgroups in the following cases:
    (a) $D_{10}$ (b) T (c) O (d) I.

51. Find a Sylow p-subgroup of $GL_2(F_p)$.

\*52. (a) Let H be a subgroup of G of prime index p. What are the possible numbers of conjugate subgroups of H?
    (b) Suppose that p is the smallest prime integer which divides $|G|$. Prove that H is a normal subgroup.

\*53. Let H be a Sylow p-subgroup of G, and let $K = N(H)$. Prove or disprove: $K = N(K)$.

54. Let G be a group of order $p^em$. Prove that G contains a subgroup of order $p^r$ for every integer $r \le e$.

55. Let $n = pm$ be an integer which is divisible exactly once by p, and let G be a group of order n. Let H be a Sylow p-subgroup of G, and let S be the set of all Sylow p-subgroups. How does S decompose into H-orbits?

\*56. (a) Compute the order of $GL_n(F_p)$.
    (b) Find a Sylow p-subgroup of $GL_n(F_p)$.
    (c) Compute the number of Sylow p-subgroups.
    (d) Use the Second Sylow Theorem to give another proof of the First Sylow Theorem.

\*57. Prove that no group of order 224 is simple.

58. Prove that if G has order $n = p^ea$ where $1 \le a < p$ and $e \ge 1$, then G has a proper normal subgroup.

59. Prove that the only simple groups of order $< 60$ are groups of prime order.

60. Classify groups of order 33.

61. Classify groups of order 18.

62. Prove that there are at most five isomorphism classes of groups of order 20.

\*63. Let G be a simple group of order 60.
    (a) Prove that G contains six Sylow 5-subgroups, ten Sylow 3-subgroups, and five Sylow 2-subgroups.
    (b) Prove that G is isomorphic to the alternating group $A_5$.

64. Determine the Class Equations of the groups of order 12.

65. Prove that a group of order $n = 2p$, where p is prime, is either cyclic or dihedral.

\*66. Let G be a group of order 30.
    (a) Prove that either the Sylow 5-subgroup K or the Sylow 3-subgroup H is normal.
    (b) Prove that HK is a cyclic subgroup of G.
    (c) Classify groups of order 30.

67. Let G be a group of order 55.
    (a) Prove that G is generated by two elements x,y, with the relations $x^{11} = 1, y^5 = 1, yxy^{-1} = x^r$, for some r, $1 \le r < 11$.
    (b) Prove that the following values of r are not possible: 2, 6, 7, 8, 10.
    (c) Prove that the remaining values are possible, and that there are two isomorphism classes of groups of order 55.

68. Verify the products (6.9).
    *(Refers to $\sigma\rho = (14387)(548) = (187)(354)$ and $\rho\sigma = (548)(14387) = (147)(385)$)*

69. Prove explicitly that the permutation $(123)(45)$ is conjugate to $(241)(35)$.

70. Let p, q be permutations. Prove that the products pq and qp have cycles of equal sizes.

71. (a) Does the symmetric group $S_7$ contain an element of order 5? of order 10? of order 15?
    (b) What is the largest possible order of an element of $S_7$?

72. Show how to determine whether a permutation is odd or even when it is written as a product of cycles.

73. Prove or disprove: The order of a permutation is the least common multiple of the orders of the cycles which make it up.

74. Is the cyclic subgroup H of $S_n$ generated by the cycle $(12345)$ a normal subgroup?

\*75. Compute the number of permutations in $S_n$ which do not leave any index fixed.

76. Determine the cycle decomposition of the permutation $i \mapsto n-i$.

77. (a) Prove that every permutation p is a product of transpositions.
    (b) How many transpositions are required to write the cycle $(123...n)$?
    (c) Suppose that a permutation is written in two ways as a product of transpositions, say $p = \tau_1 \tau_2 \dots \tau_m$ and $p = \tau_1' \tau_2' \dots \tau_n'$. Prove that m and n are both odd or else they are both even.

78. What is the centralizer of the element $(12)$ of $S_4$?

79. Find all subgroups of order 4 of the symmetric group $S_4$. Which are normal?

80. Determine the Class Equation of $A_4$.

81. (a) Determine the number of conjugacy classes and the Class Equation for $S_5$.
    (b) List the conjugacy classes in $A_5$, and reconcile this list with the list of conjugacy classes in the icosahedral group [see (2.2)].

82. Prove that the transpositions $(12), (23), \dots, (n-1, n)$ generate the symmetric group $S_n$.

83. Prove that the symmetric group $S_n$ is generated by the cycles $(12...n)$ and $(12)$.

84. (a) Show that the product of two transpositions $(ij)(kl)$ can always be written as a product of 3-cycles. Treat the case that some indices are equal too.
    (b) Prove that the alternating group $A_n$ is generated by 3-cycles, if $n \ge 3$.

85. Prove that if a proper normal subgroup of $S_n$ contains a 3-cycle, it is $A_n$.

\*86. Prove that $A_n$ is simple for all $n \ge 5$.

\*87. Prove that $A_n$ is the only subgroup of $S_n$ of index 2.

88. Explain the miraculous coincidence at the end of the section (Section 6) in terms of the opposite group (Chapter 2, Section 1, exercise 12).

89. Prove or disprove: The free group on two generators is isomorphic to the product of two infinite cyclic groups.

90. (a) Let F be the free group on x,y. Prove that the two elements $u = x^2$ and $v = y^3$ generate a subgroup of F which is isomorphic to the free group on u, v.
    (b) Prove that the three elements $u = x^2, v = y^2$, and $z = xy$ generate a subgroup isomorphic to the free group on u, v, z.

91. We may define a closed word in S' to be the oriented loop obtained by joining the ends of a word. Thus
    ![](./images/ch6_free_group_closed_word.png)
    represents a closed word, if we read it clockwise. Establish a bijective correspondence between reduced closed words and conjugacy classes in the free group.

92. Let p be a prime integer. Let N be the number of words of length p in a finite set S. Show that N is divisible by p.

93. Prove that two elements a, b of a group generate the same subgroup as $bab^2, bab^3$.

94. Prove that the smallest normal subgroup of a group G containing a subset S is generated as a subgroup by the set $\{gsg^{-1} \mid g \in G, s \in S\}$.

95. Prove or disprove: $y^2x^2$ is in the normal subgroup generated by $xy$ and its conjugates.

96. Prove that the group generated by x, y, z with the single relation $yxyz^{-2} = 1$ is actually a free group.

97. Let S be a set of elements of a group G, and let $\{r_i\}$ be some relations which hold among the elements S in G. Let F be the free group on S. Prove that the map $F \to G$ (8.1) factors through $F/N$, where N is the normal subgroup generated by $\{r_i\}$.

98. Let G be a group with a normal subgroup N. Assume that G and G/N are both cyclic groups. Prove that G can be generated by two elements.

99. A subgroup H of a group G is called characteristic if it is carried to itself by all automorphisms of G.
    (a) Prove that every characteristic subgroup is normal.
    (b) Prove that the center Z of a group G is a characteristic subgroup.
    (c) Prove that the subgroup H generated by all elements of G of order n is characteristic.

100. Determine the normal subgroups and the characteristic subgroups of the quaternion group.

101. The commutator subgroup C of a group G is the smallest subgroup containing all commutators.
    (a) Prove that the commutator subgroup is a characteristic subgroup.
    (b) Prove that G/C is an abelian group.

102. Determine the commutator subgroup of the group M of motions of the plane.

103. Prove by explicit computation that the commutator $x(yz)x^{-1}(yz)^{-1}$ is in the normal subgroup generated by the two commutators $xyx^{-1}y^{-1}$ and $xzx^{-1}z^{-1}$ and their conjugates.

104. Let G denote the free abelian group $\langle x, y \mid xyx^{-1}y^{-1}=1 \rangle$ defined in (8.8). Prove the universal property of this group: If u, v are elements of an abelian group A, there is a unique homomorphism $\phi: G \to A$ such that $\phi(x) = u, \phi(y) = v$.

105. Prove that the normal subgroup in the free group $\langle x, y \rangle$ which is generated by the single commutator $xyx^{-1}y^{-1}$ is the commutator subgroup.

106. Let N be a normal subgroup of a group G. Prove that G/N is abelian if and only if N contains the commutator subgroup of G.

107. Let $\phi: G \to G'$ be a surjective group homomorphism. Let S be a subset of G such that $\phi(S)$ generates G', and let T be a set of generators of ker $\phi$. Prove that $S \cup T$ generates G.

108. Prove or disprove: Every finite group G can be presented by a finite set of generators and a finite set of relations.

109. Let G be the group generated by x, y, z, with certain relations $\{r_i\}$. Suppose that one of the relations has the form $wx$, where w is a word in y, z. Let $r_i'$ be the relation obtained by substituting $w^{-1}$ for x into $r_i$, and let G' be the group generated by y, z, with relations $\{r_i'\}$. Prove that G and G' are isomorphic.

110. Prove that the elements x, y of (9.5) generate T, and that the permutations (9.7) generate $A_4$.
    *(Refers to $G=\langle y,x \mid y^3, x^3, yxyx \rangle$ for tetrahedral group, and permutations $x=(123), y=(234)$).*

111. Use the Todd-Coxeter Algorithm to identify the group generated by two elements x, y, with the following relations.
    (a) $x^2 = y^2 = 1, xyx = yxy$
    (b) $x^2 = y^3 = 1, xyx = yxy$
    (c) $x^3 = y^3 = 1, xyx = yxy$
    (d) $x^4 = y^2 = 1, xyx = yxy$
    (e) $x^4 = y^4 = x^2y^2 = 1$

112. Use the Todd-Coxeter Algorithm to determine the order of the group generated by x, y, with the following relations.
    (a) $x^4 = 1, y^3 = 1, xy = y^2x$ (b) $x^7 = 1, y^3 = 1, yx = x^2y$.

113. Identify the group G generated by elements x, y, z, with relations $x^4 = y^4 = z^3 = x^2z^2 = 1$ and $z = xy$.

114. Analyze the group G generated by x, y, with relations $x^4 = 1, y^4 = 1, x^2 = y^2, xy = y^3x$.

\*115. Analyze the group generated by elements x, y, with relations $x^{-1}yx = y^{-1}, y^{-1}xy = x^{-1}$.

116. Let G be the group generated by elements x, y, with relations $x^4 = 1, y^3 = 1, x^2 = yxy$. Prove that this group is trivial in these two ways.
    (a) using the Todd-Coxeter Algorithm
    (b) working directly with the relations

117. Identify the group G generated by two elements x, y, with relations $x^3 = y^3 = yxyxy = 1$.

118. Let $p \le q \le r$ be integers $>1$. The triangle group $G^{pqr}$ is defined by generators $G^{pqr} = \langle x, y, z \mid x^p, y^q, z^r, xyz \rangle$. In each case, prove that the triangle group is isomorphic to the group listed.
    (a) the dihedral group $D_n$, when $p,q,r = 2,2, n$
    (b) the tetrahedral group, when $p,q,r = 2,3,3$
    (c) the octahedral group, when $p,q,r = 2,3,4$
    (d) the icosahedral group, when $p,q,r = 2,3,5$

119. Let $\Delta$ denote an isosceles right triangle, and let a, b, c denote the reflections of the plane about the three sides of $\Delta$. Let $x = ab, y = bc, z = ca$. Prove that x, y, z generate a triangle group.

120. (a) Prove that the group G generated by elements x, y, z with relations $x^2 = y^3 = z^5 = 1, xyz = 1$ has order 60.
    (b) Let H be the subgroup generated by x and $zyz^{-1}$. Determine the permutation representation of G on G/H, and identify H.
    (c) Prove that G is isomorphic to the alternating group $A_5$.
    (d) Let K be the subgroup of G generated by x and yxz. Determine the permutation representation of G on G/K, and identify K.

121. (a) Prove that the subgroup T' of $O_3$ of all symmetries of a regular tetrahedron, including orientation-reversing symmetries, has order 24.
    (b) Is T' isomorphic to the symmetric group $S_4$?
    (c) State and prove analogous results for the group of symmetries of a dodecahedron.

122. (a) Let $U = \{1, x\}$ be a subset of order 2 of a group G. Consider the graph having one vertex for each element of G and an edge joining the vertices g to gx for all $g \in G$. Prove that the vertices connected to the vertex 1 are the elements of the cyclic group generated by x.
    (b) Do the analogous thing for the set $U = \{1, x, y\}$.

\*123. (a) Suppose that a group G operates transitively on a set S, and that H is the stabilizer of an element $s_0 \in S$. Consider the action of G on $S \times S$ defined by $g(s_1, s_2) = (gs_1, gs_2)$. Establish a bijective correspondence between double cosets of H in G and G-orbits in $S \times S$.
    (b) Work out the correspondence explicitly for the case that G is the dihedral group $D_5$ and S is the set of vertices of a 5-gon.
    (c) Work it out for the case that $G = T$ and that S is the set of edges of a tetrahedron.

\*124. Assume that $H \subset K \subset G$ are subgroups, that H is normal in K, and that K is normal in G. Prove or disprove: H is normal in G.

\*125. Prove the Bruhat decomposition, which asserts that $GL_n(\mathbb{R})$ is the union of the double cosets BPB, where B is the group of upper triangular matrices and P is a permutation matrix.

126. (a) Prove that the group generated by x, y with relations $x^2, y^2$ is an infinite group in two ways:
    (i) It is clear that every word can be reduced by using these relations to the form $\dots xyxy \dots$. Prove that every element of G is represented by exactly one such word.
    (ii) Exhibit G as the group generated by reflections r,r' about lines $l, l'$ whose angle of intersection is not a rational multiple of $2\pi$.
    (b) Let N be any proper normal subgroup of G. Prove that G/N is a dihedral group.

127. Let H, N be subgroups of a group G, and assume that N is a normal subgroup.
    (a) Determine the kernels of the restrictions of the canonical homomorphism $\pi: G \to G/N$ to the subgroups H and HN.
    (b) Apply the First Isomorphism Theorem to these restrictions to prove the Second Isomorphism Theorem: $H/(H \cap N)$ is isomorphic to $(HN)/N$.

128. Let H, N be normal subgroups of a group G such that $H \supset N$, and let $\bar{H} = H/N, \bar{G} = G/N$.
    (a) Prove that $\bar{H}$ is a normal subgroup of $\bar{G}$.
    (b) Use the composed homomorphism $G \to \bar{G} \to \bar{G}/\bar{H}$ to prove the Third Isomorphism Theorem: $G/H$ is isomorphic to $\bar{G}/\bar{H}$.

--- Generated Problems ---

129. Explain why Cayley's Theorem implies that every abstract finite group can be thought of as a group of permutations.

130. For the group $G = S_3$, find the centralizer $Z((12))$ and the conjugacy class $C_{(12)}$. Verify the formula $|G| = |C_x| |Z(x)|$ for $x=(12)$.

131. Write down the Class Equation for the dihedral group $D_4$ (symmetries of a square, order 8). Identify which terms correspond to the center $Z(D_4)$.

132. Prove that if a group G has only two conjugacy classes, then $|G|=2$.

133. Use the Class Equation to show that if $|G| = p^n$ for a prime p, then $Z(G) \neq \{e\}$.

134. Classify all groups of order $p^2$ where p is a prime. Explain the steps in your classification.

135. Describe the action of conjugation on the set of subgroups of G. What is the stabilizer of a subgroup H under this action?

136. State the First, Second, and Third Sylow Theorems. Briefly explain the main assertion of each.

137. Use Sylow's Theorems to prove that any group of order $pq$, where p and q are distinct primes with $p < q$ and p does not divide $q-1$, must be cyclic.

138. Determine the number of Sylow 5-subgroups and Sylow 3-subgroups in a group of order 45. Prove that such a group must be abelian.

139. Show that a group of order 200 must have a normal Sylow 5-subgroup.

140. Let $\sigma = (12345) \in S_7$ and $\tau = (16)(23) \in S_7$. Compute $\tau \sigma \tau^{-1}$.

141. Determine if the permutations $(12)(345)$ and $(123)(45)$ are conjugate in $S_5$. Justify your answer.

142. What is the cycle structure of permutations in $S_6$ that have order 6? List all possible cycle structures.

143. Find the order of the permutation $(123)(4567)$ in $S_7$.

144. Describe the group of affine transformations $x \mapsto cx+a$ on $F_3 = \{0,1,2\}$. List all its elements as permutations of $(0,1,2)$. What is the order of this group?

145. Consider the free group F on generators $\{a,b\}$. Is the word $a b a^{-1} b a b^{-1}$ reduced? If not, find its reduced form.

146. Explain why the free group on two generators is not abelian.

147. Let $G = \langle x, y \mid x^4=1, y^2=1, yxy=x^{-1} \rangle$. Show that this presentation defines the dihedral group $D_4$.

148. What is the commutator subgroup of an abelian group G?

149. Prove that the quotient group $G/N$ is abelian if and only if N contains the commutator subgroup of G.

150. Use the Todd-Coxeter algorithm to find the index of the subgroup $H = \langle x \rangle$ in $G = \langle x,y \mid x^3=1, y^3=1, (xy)^2=1 \rangle$.

151. Explain how the operations of a group G on itself by left multiplication and by conjugation differ in terms of transitivity and the nature of orbits.

152. If G is a finite group and $x \in G$, prove that the order of x divides $|Z(x)|$. Is the converse true?

153. If the Class Equation of a group G is $12 = 1 + 1 + 1 + 3 + 3 + 3$, what can you deduce about G? Is it abelian? What is the order of its center?

154. Prove that if a group G of order $p^n$ ($p$ prime) acts on a set S such that $p \nmid |S|$, then G must fix at least one point in S.

155. Consider the icosahedral group I. Explain why the fact that it is simple implies it cannot have a homomorphism onto a group of order 2 (like $C_2$).

156. Let H be a subgroup of G. Show that $H \subseteq N(H)$. When is $H = N(H)$?

157. Find all Sylow 2-subgroups of $S_3$. Are they conjugate? Verify this.

158. A group G has order 56. Show that it has either a normal Sylow 7-subgroup or a normal Sylow 2-subgroup.

159. How many elements of order 7 are there in a simple group of order 168? (Hint: $168 = 2^3 \cdot 3 \cdot 7$)

160. Write the permutation $(1352)(246)(14)$ in $S_6$ as a product of disjoint cycles. Determine if it is even or odd.

161. Find the centralizer of the permutation $(1234)$ in $S_4$.

162. Describe the structure of the Sylow p-subgroups of $GL_2(F_p)$.

163. Explain what it means for a set of generators S for a group G to be "free".

164. Let F be the free group on $\{x,y\}$. Show that the normal subgroup generated by $x^2$ is not the same as the subgroup generated by $x^2$.

165. Consider the group $G = \mathbb{Z}_2 \times \mathbb{Z}_2 = \langle a,b \mid a^2=1, b^2=1, ab=ba \rangle$. Apply the Todd-Coxeter algorithm to find the cosets of $H=\langle a \rangle$.

166. Prove that any group of order 77 is cyclic.

167. If $G$ is a group such that every element (except identity) has order 2, prove that $G$ is abelian. (Such groups are related to Klein-4 group and its generalizations).

168. Show that if all Sylow p-subgroups of a finite group G are normal for every prime p dividing $|G|$, then G is the direct product of its Sylow p-subgroups.

169. Can a simple group have a subgroup of index 2? Explain.

170. How many distinct cycle structures are there for permutations in $S_5$? List them.

171. If $G$ is the free group on $S = \{a,b,c\}$, what is the inverse of the element $a b^{-1} c^2 a$?

172. Explain why the relation $x^n=1$ in a group presentation $\langle x, \dots \mid x^n=1, \dots \rangle$ means that the order of the element corresponding to x in the group divides n, but is not necessarily equal to n.

173. Prove that if a group $G$ has order $pqr$ where $p < q < r$ are primes, then $G$ cannot be simple. (This is a more advanced problem).

174. Use the concept of conjugacy classes to prove that $A_4$ has no subgroup of order 6.

175. If $G$ is a group and $N$ is the normal subgroup generated by a set of relations $R$, what is the relationship between relations in $G$ and elements of $N$?

176. Describe the Todd-Coxeter algorithm's approach to handling "coincidences" or "collapses" (when two existing coset indices are found to be the same).

177. Show that the group of rotational symmetries of a cube (octahedral group O) is not simple. Find a non-trivial proper normal subgroup.

178. What is the maximum number of Sylow 7-subgroups a group of order $2^3 \cdot 3 \cdot 7$ can have?

179. Construct the Class Equation for $S_3$.

180. Let $G$ act on itself by conjugation. If $x \in Z(G)$, what is its orbit? What is its stabilizer?

181. If a group $G$ of order 12 has 4 Sylow 3-subgroups, what can you say about its Sylow 2-subgroup? (Hint: consider $A_4$).

# Chapter 7: Bilinear Forms - Problems

1.  Let $A$ and $B$ be real $n \times n$ matrices. Prove that if $X^tAY = X^tBY$ for all vectors $X, Y$ in $\mathbb{R}^n$, then $A = B$.

2.  Prove directly that the bilinear form represented by the matrix $\begin{pmatrix} a & b \\ b & d \end{pmatrix}$ is positive definite if and only if $a > 0$ and $ad - b^2 > 0$.

3.  Apply the Gram-Schmidt procedure to the basis $((1, 1, 0)^t, (1, 0, 1)^t, (0, 1, 1)^t)$, when the form is dot product. (Note: vectors are column vectors)

4.  Let $A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$. Find an orthonormal basis for $\mathbb{R}^2$ with respect to the form $X^tAY$.

5.  (a) Prove that every real square matrix is the sum of a symmetric matrix and a skew-symmetric matrix ($A^t = -A$) in exactly one way.
    (b) Let $\langle \cdot, \cdot \rangle$ be a bilinear form on a real vector space $V$. Show that there is a symmetric form $(\cdot, \cdot)$ and a skew-symmetric form $[\cdot, \cdot]$ so that $\langle \cdot, \cdot \rangle = (\cdot, \cdot) + [\cdot, \cdot]$.

6.  Let $\langle \cdot, \cdot \rangle$ be a symmetric bilinear form on a vector space $V$ over a field $F$. The function $q: V \to F$ defined by $q(v) = \langle v, v \rangle$ is called the quadratic form associated to the bilinear form. Show how to recover the bilinear form from $q$, if the characteristic of the field $F$ is not 2, by expanding $q(v + w)$.

*7. Let $X, Y$ be vectors in $\mathbb{C}^n$, and assume that $X \neq 0$. Prove that there is a symmetric matrix $B$ such that $BX = Y$.

8.  Prove that a positive definite form is nondegenerate.

9.  A matrix $A$ is called positive semidefinite if $X^tAX \ge 0$ for all $X \in \mathbb{R}^n$. Prove that $A^tA$ is positive semidefinite for any $m \times n$ real matrix $A$.

10. Find an orthogonal basis for the form on $\mathbb{R}^n$ whose matrix is as follows.
    (a) $\begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}$
    (b) $\begin{pmatrix} 1 & 0 & 1 \\ 0 & 2 & 1 \\ 1 & 1 & 1 \end{pmatrix}$

11. Extend the vector $X_1 = (1, 1, 1)^t/\sqrt{3}$ to an orthonormal basis for $\mathbb{R}^3$.

*12. Prove that if the columns of an $n \times n$ matrix $A$ form an orthonormal basis, then the rows do too.

13. Let $A, A'$ be symmetric matrices related by $A = P^tA'P$, where $P \in GL_n(F)$. Is it true that the ranks of $A$ and of $A'$ are equal?

14. Let $A$ be the matrix of a symmetric bilinear form $\langle \cdot, \cdot \rangle$ with respect to some basis. Prove or disprove: The eigenvalues of $A$ are independent of the basis.

15. Prove that the only real matrix which is orthogonal, symmetric, and positive definite is the identity.

16. The vector space $P$ of all real polynomials of degree $\le n$ has a bilinear form, defined by
    $\langle f, g \rangle = \int_{-1}^{1} f(x)g(x)dx$.
    Find an orthonormal basis for $P$ when $n$ has the following values. (a) 1 (b) 2 (c) 3

17. Let $V$ denote the vector space of real $n \times n$ matrices. Prove that $\langle A, B \rangle = \text{trace}(A^tB)$ is a positive definite bilinear form on $V$. Find an orthonormal basis for this form.

18. A symmetric matrix $A$ is called negative definite if $X^tAX < 0$ for all $X \neq 0$. Give a criterion analogous to (1.26) (Problem 2 for $2 \times 2$ matrices) for a symmetric matrix $A$ to be negative definite.

19. Prove that every symmetric nonsingular complex matrix $A$ has the form $A = P^tP$.

20. In the notation of (2.12) (Sylvester's Law proof), show by example that the span of $(v_1, \dots, v_p)$ is not determined by the form.

21. (a) Let $W$ be a subspace of a vector space $V$ on which a symmetric bilinear form is given. Prove that $W^\perp$ is a subspace.
    (b) Prove that the null space $N$ is a subspace.

22. Let $W_1, W_2$ be subspaces of a vector space $V$ with a symmetric bilinear form. Prove each of the following.
    (a) $(W_1 + W_2)^\perp = W_1^\perp \cap W_2^\perp$
    (b) $W \subset W^{\perp\perp}$
    (c) If $W_1 \subset W_2$, then $W_1^\perp \supset W_2^\perp$.

23. Prove Proposition (2.7), that $V = W \oplus W^\perp$ if the form is nondegenerate on $W$.

24. Let $V = \mathbb{R}^{2 \times 2}$ be the vector space of real $2 \times 2$ matrices.
    (a) Determine the matrix of the bilinear form $\langle A, B \rangle = \text{trace}(AB)$ on $V$ with respect to the standard basis $\{e_{ij}\}$.
    (b) Determine the signature of this form.
    (c) Find an orthogonal basis for this form.
    (d) Determine the signature of the form on the subspace of $V$ of matrices with trace zero.

*25. Determine the signature of the form $\langle A, B \rangle = \text{trace} AB$ on the space $\mathbb{R}^{n \times n}$ of real $n \times n$ matrices.

26. Let $V = \mathbb{R}^{2 \times 2}$ be the space of $2 \times 2$ matrices.
    (a) Show that the form $\langle A, B \rangle$ defined by $\langle A, B \rangle = \det(A + B) - \det A - \det B$ is symmetric and bilinear.
    (b) Compute the matrix of this form with respect to the standard basis $\{e_{ij}\}$, and determine the signature of the form.
    (c) Do the same for the subspace of matrices of trace zero.

27. Do exercise 26 for $\mathbb{R}^{3 \times 3}$, replacing the quadratic form $\det A$ by the coefficient of $t$ in the characteristic polynomial of $A$.

28. Decide what the analogue of Sylvester's Law for symmetric forms over complex vector spaces is, and prove it.

29. Using the method of proof of Theorem (2.9), find necessary and sufficient conditions on a field $F$ so that every finite-dimensional vector space $V$ over $F$ with a symmetric bilinear form $\langle \cdot, \cdot \rangle$ has an orthogonal basis.

30. Let $F = \mathbb{F}_2$ (field with 2 elements), and let $A = \begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}$.
    (a) Prove that the bilinear form $X^tAY$ on $F^2$ can not be diagonalized.
    (b) Determine the orbits for the action $P, A \mapsto PAP^t$ of $GL_2(F)$ on the space of $2 \times 2$ matrices with coefficients in $F$.

31. Let $V$ be a Euclidean space. Prove the Schwarz Inequality and the Triangle Inequality.

32. Let $W$ be a subspace of a Euclidean space $V$. Prove that $W = W^{\perp\perp}$.

33. Let $V$ be a Euclidean space. Show that if $|v| = |w|$, then $(v + w) \perp (v - w)$. Interpret this formula geometrically.

34. Prove the parallelogram law $|v + w|^2 + |v - w|^2 = 2|v|^2 + 2|w|^2$ in a Euclidean space.

35. Prove that the orthogonal projection (3.7) is a linear transformation.

36. Find the matrix of the projection $\pi: \mathbb{R}^3 \to \mathbb{R}^2$ such that the image of the standard bases of $\mathbb{R}^3$ forms an equilateral triangle and $\pi(e_1)$ points in the direction of the x-axis. (Note: $\mathbb{R}^2$ is considered a subspace of $\mathbb{R}^3$, e.g., the $xy$-plane).

*37. Let $W$ be a two-dimensional subspace of $\mathbb{R}^3$, and consider the orthogonal projection $\pi$ of $\mathbb{R}^3$ onto $W$. Let $(a_i, b_i)$ be the coordinate vector of $\pi(e_i)$, with respect to a chosen orthonormal basis of $W$. Prove that $(a_1, a_2, a_3)$ and $(b_1, b_2, b_3)$ are orthogonal unit vectors.

*38. Let $w \in \mathbb{R}^n$ be a vector of length 1.
    (a) Prove that the matrix $P = I - 2ww^t$ is orthogonal.
    (b) Prove that multiplication by $P$ is a reflection through the space $W$ orthogonal to $w$, that is, prove that if we write an arbitrary vector $v$ in the form $v = cw + w'$, where $w' \in W^\perp$, then $Pv = -cw + w'$.
    (c) Let $X, Y$ be arbitrary vectors in $\mathbb{R}^n$ with the same length. Determine a vector $w$ such that $PX = Y$.

*39. Use exercise 38 to prove that every orthogonal $n \times n$ matrix is a product of at most $n$ reflections.

40. Let $A$ be a real symmetric matrix, and let $T$ be the linear operator on $\mathbb{R}^n$ whose matrix is $A$.
    (a) Prove that $(\text{ker } T) \perp (\text{im } T)$ and that $V = (\text{ker } T) \oplus (\text{im } T)$.
    (b) Prove that $T$ is an orthogonal projection onto $\text{im } T$ if and only if, in addition to being symmetric, $A^2 = A$.

41. Let $A$ be symmetric and positive definite. Prove that the maximal matrix entries are on the diagonal.

42. Verify rules (4.4) for Hermitian forms.

43. Show that the dot product form $\langle X, Y \rangle = X^tY$ is not positive definite on $\mathbb{C}^n$. (It's not even Hermitian in general unless vectors are real). What about $\langle X, Y \rangle = X^*Y$?

44. Prove that a matrix $A$ is hermitian if and only if the associated form $\langle X,Y \rangle = X^*AX$ results in $\langle X,X \rangle$ being real for all complex vectors $X$. (The original problem was $X^*AX$ is a hermitian form, which means $\langle X,Y \rangle = X^*AY$ and we need to check if $X^*AY$ being a hermitian *value* means $A$ is hermitian, but the common statement is that $\langle X,X \rangle$ is real if $A$ is hermitian. Let's rephrase as: Prove $A$ is hermitian iff $\langle X,X \rangle = X^*AX$ is real for all $X \in \mathbb{C}^n$.)

45. Prove that the $n \times n$ hermitian matrices form a real vector space, and find a basis for that space.

46. Let $V$ be a two-dimensional hermitian space. Let $(v_1, v_2)$ be an orthonormal basis for $V$. Describe all orthonormal bases $(v_1', v_2')$ with $v_1' = v_1$.

47. Let $X, Y \in \mathbb{C}^n$ be orthogonal vectors (w.r.t. standard Hermitian product). Prove that $|X + Y|^2 = |X|^2 + |Y|^2$.

48. Is $\langle X, Y \rangle = x_1\overline{y_1} + ix_1\overline{y_2} - ix_2\overline{y_1} + ix_2\overline{y_2}$ on $\mathbb{C}^2$ a hermitian form? (Note: Text uses $X^*AY$, which is $\sum \overline{x_i} a_{ij} y_j$. The question is written more like $\sum x_i c_{ij} \overline{y_j}$. I will assume standard $\overline{x_i}a_{ij}y_j$ form or check $X^*AY$ from the given components.) If $\langle X, Y \rangle = x_1y_1 + ix_1y_2 - ix_2y_1 + ix_2y_2$, (assuming coefficients are for $x_i y_j$ and $A$ needs to be determined) this implies $a_{11}=1, a_{12}=i, a_{21}=-i, a_{22}=i$. Is $A=A^*$? $A^* = \begin{pmatrix} 1 & i \\ -i & -i \end{pmatrix}$. No, $A \neq A^*$.
    Let's assume it's about $\langle X, Y \rangle = X^* A Y$. The given expression is $\overline{x_1}y_1 + i\overline{x_1}y_2 - i\overline{x_2}y_1 + i\overline{x_2}y_2$. So $A = \begin{pmatrix} 1 & i \\ -i & i \end{pmatrix}$.
    Then $A^* = \begin{pmatrix} 1 & i \\ -i & -i \end{pmatrix}$. Since $A \ne A^*$, it's not Hermitian.

49. Let $A, B$ be positive definite hermitian matrices. Determine which of the following matrices are positive definite hermitian: $A^2, A^{-1}, AB, A + B$.

50. Prove that the determinant of a hermitian matrix is a real number.

51. Prove that $A$ is positive definite hermitian if and only if $A = P^*P$ for some invertible matrix $P$.

52. Prove Theorem (4.19), that a hermitian form on a complex vector space $V$ has an orthonormal basis if and only if it is positive definite.

53. Extend the criterion (1.26) (Problem 2 for $2 \times 2$ matrices) for positive definiteness to hermitian matrices.

54. State and prove an analogue of Sylvester's Law for hermitian matrices.

55. Let $\langle \cdot, \cdot \rangle$ be a hermitian form on a complex vector space $V$, and let $\{v, w\}$ denote the real part of the complex number $\langle v, w \rangle$. Prove that if $V$ is regarded as a real vector space, then $\{\cdot, \cdot\}$ is a symmetric bilinear form on $V$, and if $\langle \cdot, \cdot \rangle$ is positive definite, then $\{\cdot, \cdot\}$ is too. What can you say about the imaginary part?

56. Let $P$ be the vector space of polynomials of degree $\le n$.
    (a) Show that $\langle f, g \rangle = \int_{0}^{2\pi} f(e^{i\theta})\overline{g(e^{i\theta})}d\theta$ is a positive definite hermitian form on $P$.
    (b) Find an orthonormal basis for this form.

57. Determine whether or not the following rules define hermitian forms on the space $\mathbb{C}^{n \times n}$ of complex matrices, and if so, determine their signature.
    (a) $\langle A, B \rangle \mapsto \text{trace}(A^*B)$
    (b) $\langle A, B \rangle \mapsto \text{trace}(AB)$

58. Let $A$ be a unitary matrix. Prove that $|\det A| = 1$.

59. Let $P$ be a unitary matrix, and let $X_1, X_2$ be eigenvectors for $P$, with distinct eigenvalues $\lambda_1, \lambda_2$. Prove that $X_1$ and $X_2$ are orthogonal with respect to the standard hermitian product on $\mathbb{C}^n$.

*60. Let $A$ be any complex matrix. Prove that $I + A^*A$ is nonsingular.

61. Prove Proposition (4.20) (If $W$ is subspace of Hermitian space $V$, restriction of form to $W$ is nondegenerate, then $V=W \oplus W^\perp$).

62. Prove that if $T$ is a hermitian operator then the rule $\{v, w\} = \langle v, Tw \rangle = X^*MY$ defines a second hermitian form on $V$. (More accurately, show $(v,Tw)$ is a sesquilinear form. For it to be Hermitian, we need $\langle v,Tw \rangle = \overline{\langle w,Tv \rangle}$. Since $T$ is Hermitian, $\overline{\langle w,Tv \rangle} = \overline{\langle Tw,v \rangle} = \langle v,Tw \rangle$. So yes, it's Hermitian.)

63. Prove that the eigenvalues of a real symmetric matrix are real numbers. (Can be done without reference to Hermitian matrices).

64. Prove that eigenvectors associated to distinct eigenvalues of a hermitian matrix $A$ are orthogonal.

65. Find a unitary matrix $P$ so that $PAP^*$ is diagonal, when $A = \begin{pmatrix} 1 & i \\ -i & 1 \end{pmatrix}$.

66. Find a real orthogonal matrix $P$ so that $PAP^t$ is diagonal, when
    (a) $A = \begin{pmatrix} 1 & 2 \\ 2 & 1 \end{pmatrix}$,
    (b) $A = \begin{pmatrix} 1 & 1 & 1 \\ 1 & 1 & 1 \\ 1 & 1 & 1 \end{pmatrix}$,
    (c) $A = \begin{pmatrix} 1 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \end{pmatrix}$.

67. Prove the equivalence of conditions (a) and (b) of the Spectral Theorem (5.4 or 5.8).

68. Prove that a real symmetric matrix $A$ is positive definite if and only if its eigenvalues are positive.

69. Show that the only matrix which is both positive definite hermitian and unitary is the identity $I$.

70. Let $A$ be a real symmetric matrix. Prove that $e^A$ is symmetric and positive definite.

71. Prove that for any square matrix $A$, $\text{ker } A = (\text{im } A^*)^\perp$.

*72. Let $\zeta = e^{2\pi i/n}$, and let $A$ be the $n \times n$ matrix $a_{jk} = \zeta^{jk}/\sqrt{n}$. Prove that $A$ is unitary.

73. Show that for every complex matrix $A$ there is a unitary matrix $P$ such that $PAP^*$ is upper triangular (Schur decomposition).

74. Let $A$ be a hermitian matrix. Prove that there is a unitary matrix $P$ with determinant 1 such that $PAP^*$ is diagonal.

*75. Let $A, B$ be hermitian matrices which commute. Prove that there is a unitary matrix $P$ such that $PAP^*$ and $PBP^*$ are both diagonal.

76. Use the Spectral Theorem to give a new proof of the fact that a positive definite real symmetric $n \times n$ matrix $P$ has the form $P = AA^t$ for some $n \times n$ matrix $A$.

77. Let $\lambda, \mu$ be distinct eigenvalues of a complex symmetric matrix $A$ (i.e. $A=A^t$, not $A=A^*$), and let $X, Y$ be eigenvectors associated to these eigenvalues. Prove that $X$ is orthogonal to $Y$ with respect to dot product (i.e. $X^tY=0$).

78. Determine the type of the quadric $x^2 + 4xy + 2xz + z^2 + 3x + z - 6 = 0$.

79. Suppose that (6.1) represents an ellipse. Instead of diagonalizing the form and then making a translation to reduce to the standard type, we could make the translation first. Show how to compute the required translation by calculus.

80. Discuss all degenerate loci for conics.

81. Give a necessary and sufficient condition, in terms of the coefficients of its equation, for a conic to be a circle.

82. (a) Describe the types of conic in terms of the signature of the quadratic form.
    (b) Do the same for quadrics in $\mathbb{R}^3$.

83. Describe the degenerate quadrics, that is, those which are not listed in (6.14).

84. Show that for any normal matrix $A$, $\text{ker } A = (\text{im } A)^\perp$. (Note: this is $\text{ker } A = \text{ker } A^*A = \text{ker } A^* = (\text{im } A)^\perp$).

85. Prove or disprove: If $A$ is a normal matrix and $W$ is an $A$-invariant subspace of $V = \mathbb{C}^n$, then $W^\perp$ is also $A$-invariant. (Hint: It's $A^*$-invariant for normal $A$.)

86. A matrix is skew-hermitian if $A^* = -A$. What can you say about the eigenvalues and the possibility of diagonalizing such a matrix?

87. Prove that the cyclic shift operator $M = \begin{pmatrix} 0 & 1 & 0 & \dots & 0 \\ 0 & 0 & 1 & \dots & 0 \\ \vdots & & & \ddots & \vdots \\ 0 & 0 & 0 & \dots & 1 \\ 1 & 0 & 0 & \dots & 0 \end{pmatrix}$ is normal, and determine its diagonalization.

88. Let $P$ be a real matrix which is normal and has real eigenvalues. Prove that $P$ is symmetric.

89. Let $P$ be a real skew-symmetric matrix. Prove that $P$ is normal.

*90. Prove that the circulant matrix $C = \begin{pmatrix} c_0 & c_1 & c_2 & \dots & c_{n-1} \\ c_{n-1} & c_0 & c_1 & \dots & c_{n-2} \\ \vdots & & & \ddots & \vdots \\ c_1 & c_2 & c_3 & \dots & c_0 \end{pmatrix}$ is a normal matrix.

91. (a) Let $A$ be a complex symmetric matrix. Prove that eigenvectors of $A$ with distinct eigenvalues are orthogonal with respect to the bilinear form $X^tX$.
    *(b) Give an example of a complex symmetric matrix $A$ such that there is no $P \in O_n(\mathbb{C})$ (complex orthogonal matrix $P^tP=I$) with $PAP^t$ diagonal.

92. Let $A$ be a normal matrix. Prove that $A$ is hermitian if and only if all eigenvalues of $A$ are real, and that $A$ is unitary if and only if every eigenvalue has absolute value 1.

93. Let $V$ be a finite-dimensional complex vector space with a positive definite hermitian form $\langle \cdot, \cdot \rangle$, and let $T: V \to V$ be a linear operator on $V$. Let $A$ be the matrix of $T$ with respect to an orthonormal basis $B$. The adjoint operator $T^*: V \to V$ is defined as the operator whose matrix with respect to the same basis is $A^*$.
    (a) Prove that $T$ and $T^*$ are related by the equations $\langle Tv, w \rangle = \langle v, T^*w \rangle$ and $\langle v, Tw \rangle = \langle T^*v, w \rangle$ for all $v, w \in W$. Prove that the first of these equations characterizes $T^*$.
    (b) Prove that $T^*$ does not depend on the choice of orthonormal basis.
    (c) Let $v$ be an eigenvector for $T$ with eigenvalue $\lambda$, and let $W = v^\perp$ be the space of vectors orthogonal to $v$. Prove that $W$ is $T^*$-invariant.

94. Prove that for any linear operator $T$, $TT^*$ is hermitian.

95. Let $V$ be a finite-dimensional complex vector space with a positive definite hermitian form $\langle \cdot, \cdot \rangle$. A linear operator $T: V \to V$ is called normal if $TT^* = T^*T$.
    (a) Prove that $T$ is normal if and only if $\langle Tv, Tw \rangle = \langle T^*v, T^*w \rangle$ for all $v, w \in V$, and verify that hermitian operators and unitary operators are normal.
    (b) Assume that $T$ is a normal operator, and let $v$ be an eigenvector for $T$, with eigenvalue $\lambda$. Prove that $v$ is also an eigenvector for $T^*$, and determine its eigenvalue.
    (c) Prove that if $v$ is an eigenvector, then $W = v^\perp$ is $T$-invariant, and use this to prove the Spectral Theorem for normal operators.

96. Prove or disprove: A matrix $A$ is skew-symmetric if and only if $X^tAX = 0$ for all $X$.

97. Prove that a form is skew-symmetric if and only if its matrix has the properties (8.3) ($a_{ii}=0, a_{ij}=-a_{ji}$).

98. Prove or disprove: A skew-symmetric $n \times n$ matrix is singular if $n$ is odd.

99. Prove or disprove: The eigenvalues of a real skew-symmetric matrix are purely imaginary.

*100. Let $S$ be a real skew-symmetric matrix. Prove that $I + S$ is invertible, and that $(I - S)(I + S)^{-1}$ is orthogonal.

*101. Let $A$ be a real skew-symmetric matrix.
    (a) Prove that $\det A \ge 0$.
    (b) Prove that if $A$ has integer entries, then $\det A$ is the square of an integer.

102. Let $\langle \cdot, \cdot \rangle$ be a skew-symmetric form on a vector space $V$. Define orthogonality, null space, and nondegenerate forms as in Section 2.
    (a) Prove that the form is nondegenerate if and only if its matrix with respect to any basis is nonsingular.
    (b) Prove that if $W$ is a subspace such that the restriction of the form to $W$ is nondegenerate, then $V = W \oplus W^\perp$.
    (c) Prove that if the form is not identically zero, then there is a subspace $W$ and a basis of $W$ such that the restriction of the form to $W$ has matrix $\begin{pmatrix} 0 & 1 \\ -1 & 0 \end{pmatrix}$.
    (d) Prove Theorem (8.5).

103. Determine the symmetry of the matrices $AB + BA$ and $AB - BA$ in the following cases.
    (a) $A, B$ symmetric
    (b) $A, B$ hermitian
    (c) $A, B$ skew-symmetric
    (d) $A$ symmetric, $B$ skew-symmetric

104. State which of the following rules define operations of $GL_n(\mathbb{C})$ on the space $\mathbb{C}^{n \times n}$ of all complex matrices:
    $P, A \mapsto PAP^*$, $(P^{-1})^t A (P^{-1})$, $(P^{-1})^t A P^t$, $P^{-1}AP^t$, $AP^t$, $P^tA$.

105. (a) With each of the following types of matrices, describe the possible determinants:
    (i) real orthogonal (ii) complex orthogonal (iii) unitary (iv) hermitian (v) symplectic (real, $Q^tJQ=J$ with $J=\begin{pmatrix} 0 & I \\ -I & 0 \end{pmatrix}$) (vi) real symmetric, positive definite (vii) real symmetric, negative definite
    (b) Which of these types of matrices have only real eigenvalues?

106. (a) Let $E$ be an arbitrary complex matrix. Prove that the matrix $\begin{pmatrix} I & E^* \\ -E & I \end{pmatrix}$ is invertible.
    (b) Find the inverse in block form of $\begin{pmatrix} A & B \\ C & D \end{pmatrix}$ assuming $A$ and $D-CA^{-1}B$ are invertible.

*107. (a) What is wrong with the following argument? Let $P$ be a real orthogonal matrix. Let $X$ be a (possibly complex) eigenvector of $P$, with eigenvalue $\lambda$. Then $X^tP^tX = (PX)^tX = (\lambda X)^tX = \lambda X^tX$. On the other hand, $X^tP^tX = X^t(P^{-1}X) = X^t(\lambda^{-1}X) = \lambda^{-1} X^tX$. Therefore $\lambda = \lambda^{-1}$, and so $\lambda = \pm 1$.
    (b) State and prove a correct theorem based on this argument for eigenvalues of real orthogonal matrices.

*108. Show how to describe any element of $SO_4$ (special orthogonal group in 4D) in terms of rotations of two orthogonal planes in $\mathbb{R}^4$.

*109. Let $A$ be a real $m \times n$ matrix. Prove that there are orthogonal matrices $P \in O_m$ and $Q \in O_n$ such that $PAQ^t = D$ is diagonal (entries $d_{ii} \ge 0$, all other $d_{ij}=0$). (This is the Singular Value Decomposition).

--- Generated Written-Answer Problems ---

110. Define what a bilinear form $f: V \times V \to F$ is. Provide an example of a bilinear form on $\mathbb{R}^2$ and verify its bilinearity. Provide an example of a function $g: \mathbb{R}^2 \times \mathbb{R}^2 \to \mathbb{R}$ that is linear in the first variable but not the second.

111. Let $V$ be a vector space over a field $F$. If $f(v,w)$ is a bilinear form, show that $f(v,0) = 0$ and $f(0,w) = 0$ for all $v,w \in V$.

112. Consider the bilinear form on $\mathbb{R}^2$ given by $f(X,Y) = x_1y_1 - 2x_1y_2 + x_2y_1 + 3x_2y_2$. Find the matrix $A$ of this form with respect to the standard basis $B = \{e_1, e_2\}$. Is this form symmetric?

113. Let $f(X,Y) = X^t A Y$ be a bilinear form on $\mathbb{R}^n$. If $A$ is symmetric, prove that $f(X,Y) = f(Y,X)$.

114. The matrix of a bilinear form on $\mathbb{R}^2$ with respect to the standard basis $B$ is $A = \begin{pmatrix} 1 & 2 \\ 0 & 3 \end{pmatrix}$. Find the matrix $A'$ of this form with respect to the new basis $B' = \{v_1' = (1,1)^t, v_2' = (1,-1)^t\}$.

115. Explain the difference between a bilinear form being symmetric ($A=A^t$) and a bilinear form being positive definite. Can a form be one without being the other? Give examples.

116. Use the Gram-Schmidt procedure to find an orthonormal basis for $\mathbb{R}^2$ with respect to the bilinear form given by the matrix $A = \begin{pmatrix} 2 & -1 \\ -1 & 2 \end{pmatrix}$, starting with the standard basis.

117. Prove that if a real symmetric matrix $A$ is positive definite, then all its diagonal entries must be positive.

118. Determine if the matrix $A = \begin{pmatrix} 1 & 2 & 0 \\ 2 & 5 & -1 \\ 0 & -1 & 3 \end{pmatrix}$ is positive definite using the leading principal minors criterion.

119. Define the null space $N$ of a symmetric bilinear form $\langle \cdot, \cdot \rangle$. Prove that $N$ is a subspace of $V$.

120. Let $\langle X,Y \rangle = X^t A Y$ be a bilinear form on $\mathbb{R}^n$. Show that the form is nondegenerate if and only if $A$ is invertible.

121. Find the signature $(p,m,z)$ of the symmetric bilinear form on $\mathbb{R}^3$ represented by the matrix $A = \begin{pmatrix} 0 & 1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & -1 \end{pmatrix}$.

122. Let $V$ be a Euclidean space. Prove the Triangle Inequality: $|v+w| \le |v| + |w|$. When does equality hold?

123. Let $W$ be the subspace of $\mathbb{R}^3$ spanned by $(1,1,0)^t$. Find the orthogonal projection of the vector $v=(1,2,3)^t$ onto $W$ with respect to the standard dot product.

124. Define a Hermitian form on a complex vector space $V$. What are the key differences in its properties compared to a real symmetric bilinear form?

125. Let $A = \begin{pmatrix} 1 & 1+i \\ 1-i & 2 \end{pmatrix}$. Is $A$ a Hermitian matrix? If so, is it positive definite?

126. If $P$ is a unitary matrix, prove that its columns form an orthonormal basis for $\mathbb{C}^n$ with respect to the standard Hermitian product.

127. Let $T$ be a linear operator on a Hermitian space $V$. If the matrix $M$ of $T$ with respect to an orthonormal basis is $M = \begin{pmatrix} 2 & i \\ -i & 1 \end{pmatrix}$, is $T$ a Hermitian operator? Find the eigenvalues of $M$. Are they real?

128. State the Spectral Theorem for real symmetric matrices. Explain its significance in terms of diagonalizing the matrix.

129. The quadratic form $q(x,y) = 2x^2 - 4xy + 5y^2$ is given. Write down the symmetric matrix $A$ associated with $q$. Is this quadratic form positive definite?

130. Outline the steps to transform the general equation of a conic $X^tAX + BX + c = 0$ into a standard form, specifying the types of transformations used.

131. Define a normal matrix $M$. Show that if $M$ is Hermitian ($M=M^*$) or unitary ($MM^*=I$), then $M$ is normal. Give an example of a normal matrix that is neither Hermitian nor unitary.

132. Let $M = \begin{pmatrix} 0 & 1 \\ -1 & 0 \end{pmatrix}$. Is $M$ skew-symmetric (over $\mathbb{R}$)? Is it normal (over $\mathbb{C}$)? Find its eigenvalues.

133. Prove that if a bilinear form $\langle \cdot, \cdot \rangle$ on $V$ satisfies $\langle v,v \rangle = 0$ for all $v \in V$, then it must satisfy $\langle v,w \rangle = -\langle w,v \rangle$ for all $v,w \in V$.

134. If $A$ is a nonsingular skew-symmetric $m \times m$ matrix over a field $F$, prove that $m$ must be even.

135. If $f$ is a bilinear form on $V$, and $A$ is its matrix in basis $B$, and $A'$ is its matrix in basis $B'$, where $B'$ is obtained from $B$ by $P$ (i.e., columns of $P$ are new basis vectors in terms of old, $X=PX'$), derive the relationship $A'=(P^t)^{-1}AP^{-1}$. (This corresponds to $P^t A' P = A$ in the text).

136. Consider $V=\mathbb{R}^3$. Let $\langle u,v \rangle = u_1v_1 + u_2v_2 - u_3v_3$. Is this form symmetric? Is it positive definite? Find a non-zero vector $v$ such that $\langle v,v \rangle = 0$. Find a vector $w$ such that $\langle w,w \rangle < 0$.

137. Prove that the eigenvalues of a skew-Hermitian matrix (i.e., $A^* = -A$) are purely imaginary or zero.

138. Let $A$ be an $n \times n$ real symmetric matrix. Show that if $X$ and $Y$ are eigenvectors corresponding to distinct eigenvalues $\lambda_1 \neq \lambda_2$, then $X$ and $Y$ are orthogonal with respect to the standard dot product.

139. What is the geometric interpretation of the Spectral Theorem for a $2 \times 2$ real symmetric matrix in terms of transforming an ellipse $X^tAX=1$?

140. Can the Gram-Schmidt procedure be applied to an indefinite symmetric bilinear form? If so, what properties would the resulting basis have? If not, why not?

141. Consider the bilinear form $\langle A,B \rangle = \text{tr}(A^tB)$ on $M_{n \times n}(\mathbb{R})$. Show it is symmetric and positive definite.

142. If $A$ is a real symmetric matrix such that $A^2=A$ (i.e., $A$ is a projection matrix), what can be said about its eigenvalues? Show that $\mathbb{R}^n = \text{Im}(A) \oplus \text{Ker}(A)$ and that $\text{Im}(A) \perp \text{Ker}(A)$.

143. Discuss the relationship between positive definite forms and the concept of "distance" or "length" in a vector space.

144. How does the signature of a quadratic form $q(x,y)$ relate to the type of conic section represented by $q(x,y)=1$? (e.g., $x^2+y^2=1$ vs $x^2-y^2=1$).

145. Let $A$ be a real symmetric matrix. Prove that $A$ is positive semidefinite if and only if all its eigenvalues are non-negative.

146. Explain why any quadratic form $X^tAX$ (with $A$ symmetric) can be written as a sum/difference of squares $\sum \lambda_i y_i^2$ after an orthogonal change of variables $X=PY$. What are the $\lambda_i$?

147. Given a Hermitian matrix $A$, show that $U = e^{iA}$ (defined via power series) is a unitary matrix.

148. If a real symmetric bilinear form $\langle \cdot, \cdot \rangle$ is positive definite, show that its restriction to any subspace $W \subset V$ is also positive definite.

149. Let $A$ be a normal matrix. If $A$ is also upper triangular, prove that $A$ must be diagonal. (Hint: Compare $(AA^*)_{11}$ and $(A^*A)_{11}$).

150. Define an "orthogonal basis" and an "orthonormal basis" with respect to a general symmetric bilinear form $\langle \cdot, \cdot \rangle$. When does an orthonormal basis exist?

151. If a bilinear form on $\mathbb{R}^2$ has matrix $A = \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}$, describe its null space. Is the form degenerate?

152. Consider a real vector space $V$ and a symmetric bilinear form $\langle \cdot, \cdot \rangle$. If $v, w \in V$ are such that $\langle v,v \rangle > 0$, $\langle w,w \rangle > 0$, and $\langle v,w \rangle = 0$, prove that $v$ and $w$ are linearly independent.