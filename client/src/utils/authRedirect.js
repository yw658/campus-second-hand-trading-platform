export function redirectToLogin(currentPath, navigate) {
    // 把当前页面路径作为 ?redirect 参数传给 login 页面
    const encoded = encodeURIComponent(currentPath);
    navigate(`/login?redirect=${encoded}`);
}