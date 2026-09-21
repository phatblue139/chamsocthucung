const users = [
    {email:"user@neko.com",password:"123456",role:"user"},
    {email:"admin@neko.com",password:"123456",role:"admin"}
];

const loginForm = document.getElementById("loginForm");

if(loginForm){
    loginForm.addEventListener("submit", function(event){
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;
        const message = document.getElementById("loginMessage");

        message.className = "message";

        if(!email || !password){
            message.textContent = "Vui lòng nhập đầy đủ email và mật khẩu.";
            message.classList.add("error");
            return;
        }

        const user = users.find(item =>
            item.email === email &&
            item.password === password &&
            item.role === role
        );

        if(user){
            localStorage.setItem("nekoUser", JSON.stringify({
                email:user.email,
                role:user.role
            }));
            message.textContent = "Đăng nhập thành công!";
            message.classList.add("success");
        }else{
            message.textContent = "Email, mật khẩu hoặc vai trò không chính xác.";
            message.classList.add("error");
        }
    });
}
