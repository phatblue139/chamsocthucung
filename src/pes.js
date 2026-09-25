// ==========================================
// 20. ĐỌC DỮ LIỆU TỪ LOCAL STORAGE
// ==========================================

let pets = JSON.parse(localStorage.getItem("pets"));


// ==========================================
// 11. DỮ LIỆU MẪU RIÊNG
// ==========================================

// Nếu LocalStorage chưa có dữ liệu
// thì tạo dữ liệu mẫu

if (pets == null) {

    pets = [
        {
            id: 1,
            name: "Milo",
            type: "Chó",
            age: 2,
            gender: "Đực"
        },

        {
            id: 2,
            name: "Miu",
            type: "Mèo",
            age: 1,
            gender: "Cái"
        },

        {
            id: 3,
            name: "Bông",
            type: "Chó",
            age: 3,
            gender: "Cái"
        },

        {
            id: 4,
            name: "Lucky",
            type: "Mèo",
            age: 2,
            gender: "Đực"
        },

        {
            id: 5,
            name: "Coco",
            type: "Thỏ",
            age: 1,
            gender: "Cái"
        },

        {
            id: 6,
            name: "Tom",
            type: "Mèo",
            age: 4,
            gender: "Đực"
        }
    ];


    // Lưu dữ liệu mẫu vào LocalStorage
    localStorage.setItem("pets", JSON.stringify(pets));
}


// ==========================================
// 11. HIỂN THỊ DANH SÁCH THÚ CƯNG
// ==========================================

function displayPets() {

    let petList = document.getElementById("petList");

    petList.innerHTML = "";


    for (let i = 0; i < pets.length; i++) {

        petList.innerHTML += `
            <tr>

                <td>${pets[i].id}</td>

                <td>${pets[i].name}</td>

                <td>${pets[i].type}</td>

                <td>${pets[i].age}</td>

                <td>${pets[i].gender}</td>

                <td>

                    <button onclick="editPet(${pets[i].id})">
                        Sửa
                    </button>

                    <button onclick="deletePet(${pets[i].id})">
                        Xóa
                    </button>

                    <button onclick="detailPet(${pets[i].id})">
                        Chi tiết
                    </button>

                </td>

            </tr>
        `;
    }
}


// ==========================================
// 12. HIỆN FORM THÊM THÚ CƯNG
// ==========================================

function showForm() {

    document.getElementById("petForm").style.display = "block";

    document.getElementById("formTitle").innerText = "Thêm thú cưng";


    // Xóa dữ liệu cũ trong form

    document.getElementById("petId").value = "";

    document.getElementById("petName").value = "";

    document.getElementById("petType").value = "";

    document.getElementById("petAge").value = "";

    document.getElementById("petGender").value = "Đực";
}


// ==========================================
// ẨN FORM
// ==========================================

function hideForm() {

    document.getElementById("petForm").style.display = "none";
}


// ==========================================
// 13. CHỨC NĂNG THÊM THÚ CƯNG
// ==========================================

function savePet() {

    // Lấy dữ liệu từ form

    let id = document.getElementById("petId").value;

    let name = document.getElementById("petName").value.trim();

    let type = document.getElementById("petType").value;

    let age = document.getElementById("petAge").value;

    let gender = document.getElementById("petGender").value;


    // ==========================================
    // 17. VALIDATION TÊN
    // ==========================================

    if (name == "") {

        alert("Tên thú cưng không được để trống!");

        return;
    }


    // ==========================================
    // 18. VALIDATION LOÀI
    // ==========================================

    if (type == "") {

        alert("Vui lòng chọn loài thú cưng!");

        return;
    }


    // ==========================================
    // 19. VALIDATION TUỔI
    // ==========================================

    if (age == "") {

        alert("Vui lòng nhập tuổi!");

        return;
    }


    if (Number(age) < 0) {

        alert("Tuổi không được nhỏ hơn 0!");

        return;
    }


    // ==========================================
    // 14. SỬA THÚ CƯNG
    // ==========================================

    if (id != "") {

        for (let i = 0; i < pets.length; i++) {

            if (pets[i].id == id) {

                pets[i].name = name;

                pets[i].type = type;

                pets[i].age = Number(age);

                pets[i].gender = gender;

                break;
            }
        }

        alert("Sửa thông tin thú cưng thành công!");

    }


    // ==========================================
    // 13. THÊM THÚ CƯNG
    // ==========================================

    else {

        let newId = 1;


        // Nếu đã có dữ liệu
        // tạo ID lớn hơn ID cuối

        if (pets.length > 0) {

            newId = pets[pets.length - 1].id + 1;
        }


        let newPet = {

            id: newId,

            name: name,

            type: type,

            age: Number(age),

            gender: gender
        };


        // Thêm vào mảng

        pets.push(newPet);


        alert("Thêm thú cưng thành công!");
    }


    // ==========================================
    // 20. LƯU DỮ LIỆU VÀO LOCAL STORAGE
    // ==========================================

    localStorage.setItem("pets", JSON.stringify(pets));


    // Hiển thị lại danh sách

    displayPets();


    // Đóng form

    hideForm();
}


// ==========================================
// 14. CHỨC NĂNG SỬA
// ==========================================

function editPet(id) {

    let pet = null;


    // Tìm thú cưng

    for (let i = 0; i < pets.length; i++) {

        if (pets[i].id == id) {

            pet = pets[i];

            break;
        }
    }


    // Nếu không tìm thấy

    if (pet == null) {

        alert("Không tìm thấy thú cưng!");

        return;
    }


    // Đưa dữ liệu lên form

    document.getElementById("petId").value = pet.id;

    document.getElementById("petName").value = pet.name;

    document.getElementById("petType").value = pet.type;

    document.getElementById("petAge").value = pet.age;

    document.getElementById("petGender").value = pet.gender;


    // Đổi tiêu đề

    document.getElementById("formTitle").innerText =
        "Sửa thông tin thú cưng";


    // Hiện form

    document.getElementById("petForm").style.display = "block";
}


// ==========================================
// 15. CHỨC NĂNG XÓA
// ==========================================

function deletePet(id) {

    let confirmDelete = confirm(
        "Bạn có chắc chắn muốn xóa thú cưng này không?"
    );


    if (confirmDelete == true) {

        for (let i = 0; i < pets.length; i++) {

            if (pets[i].id == id) {

                pets.splice(i, 1);

                break;
            }
        }


        // Lưu lại LocalStorage

        localStorage.setItem(
            "pets",
            JSON.stringify(pets)
        );


        // Hiển thị lại

        displayPets();


        alert("Xóa thú cưng thành công!");
    }
}


// ==========================================
// 16. XEM CHI TIẾT
// ==========================================

function detailPet(id) {

    let pet = null;


    // Tìm thú cưng

    for (let i = 0; i < pets.length; i++) {

        if (pets[i].id == id) {

            pet = pets[i];

            break;
        }
    }


    if (pet == null) {

        alert("Không tìm thấy thú cưng!");

        return;
    }


    // Hiển thị chi tiết

    document.getElementById("petDetail").innerHTML = `

        <h2>Chi tiết thú cưng</h2>

        <p>
            <b>ID:</b> ${pet.id}
        </p>

        <p>
            <b>Tên:</b> ${pet.name}
        </p>

        <p>
            <b>Loài:</b> ${pet.type}
        </p>

        <p>
            <b>Tuổi:</b> ${pet.age}
        </p>

        <p>
            <b>Giới tính:</b> ${pet.gender}
        </p>

    `;
}