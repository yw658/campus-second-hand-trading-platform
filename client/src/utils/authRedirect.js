export function redirectToLogin(currentPath, navigate) {
    const encoded = encodeURIComponent(currentPath);
    navigate(`/login?redirect=${encoded}`);
}