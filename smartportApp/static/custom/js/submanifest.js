document.addEventListener("DOMContentLoaded", () => {
  console.log("hello: ", csrftoken);

  // approve
  document.querySelectorAll(".btn-icon.approve").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const submanifestId = btn.dataset.submanifestId;
      await handleClearanceAction(submanifestId, "approve");
    });
  });
  // reject -> show modal
  const rejectModal = document.getElementById("rejectModal");
  const rejectForm = document.getElementById("rejectForm");
  const rejectNote = document.getElementById("rejectNote");
  const rejectSubmanifestId = document.getElementById("rejectSubmanifestId");
  const cancelRejectBtn = document.getElementById("cancelRejectBtn");
  document.querySelectorAll(".btn-icon.reject").forEach((btn) => {
    btn.addEventListener("click", () => {
      const submanifestId = btn.dataset.submanifestId;
      rejectSubmanifestId.value = submanifestId;
      rejectNote.value = "";
      rejectModal.style.display = "flex";
    });
  });

  // cancel reject -> hide modal
  cancelRejectBtn.addEventListener("click", () => {
    rejectModal.style.display = "none";
  });
  // close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === rejectModal) {
      rejectModal.style.display = "none";
    }
  });

  // submit reject -> update db and send notif to shipper
  rejectForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submanifestId = rejectSubmanifestId.value;
    const note = rejectNote.value.trim();

    if (!note) {
      showToast("Rejection reason is required.", true);
      return;
    }

    await handleClearanceAction(submanifestId, "reject", { note });
    rejectModal.style.display = "none";
  });

  const handleClearanceAction = async (
    submanifestId,
    action,
    extraData = {}
  ) => {
    try {
      const response = await fetch(
        `/customs/clearance/${submanifestId}/${action}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify(extraData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        showToast(data.message);
        // disable buttons:
        document.querySelector(
          `.btn-icon.approve[data-submanifest-id="${submanifestId}"]`
        ).disabled = true;
        document.querySelector(
          `.btn-icon.reject[data-submanifest-id="${submanifestId}"]`
        ).disabled = true;
      } else {
        showToast(data.error, true);
        console.error(data.error);
      }
    } catch (error) {
      console.error("Error: ", error);
      showToast("Something went wrong. Try again.", true);
    }
  };
});

const showToast = (msg, isError = false, duration = 2500) => {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${isError ? "error" : ""}`;
  toast.textContent = msg;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
};
