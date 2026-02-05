document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("userId");
    const firstName = localStorage.getItem("first_name");
    const fullName = localStorage.getItem("fullName") || "Patient";
    
    console.log("🔍 Loaded from localStorage:", { 
      userId, 
      firstName, 
      fullName,
      allStorage: JSON.stringify(localStorage) // Log all localStorage for debugging
    });
});


