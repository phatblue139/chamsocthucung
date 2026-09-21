const pets = [
    {id:1,name:"Bông",type:"Chó"},
    {id:2,name:"Miu",type:"Mèo"},
    {id:3,name:"Max",type:"Chó"},
    {id:4,name:"Milo",type:"Mèo"}
];

const schedules = [
    {pet:"Bông",service:"Tắm",date:"22/09/2026"},
    {pet:"Miu",service:"Cắt móng",date:"24/09/2026"},
    {pet:"Max",service:"Khám sức khỏe",date:"26/09/2026"},
    {pet:"Milo",service:"Vệ sinh tai",date:"28/09/2026"}
];

const totalPets = document.getElementById("totalPets");
const totalSchedules = document.getElementById("totalSchedules");
const scheduleList = document.getElementById("scheduleList");

if(totalPets) totalPets.textContent = pets.length;
if(totalSchedules) totalSchedules.textContent = schedules.length;

if(scheduleList){
    schedules.forEach(item=>{
        scheduleList.innerHTML += `
            <div class="schedule-item">
                <div>
                    <strong>${item.pet}</strong>
                    <p>${item.service}</p>
                </div>
                <span class="schedule-date">${item.date}</span>
            </div>
        `;
    });
}
