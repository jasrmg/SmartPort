document.addEventListener("DOMContentLoaded", () => {
  console.log("hello: ", csrftoken);

  // HS Code editing functionality
  document.querySelectorAll(".hs-code-editable").forEach((element) => {
    element.addEventListener("click", () => {
      makeHsCodeEditable(element);
    });
  });

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

  // HS Code editing function
  const makeHsCodeEditable = (element) => {
    const cargoId = element.dataset.cargoId;
    const currentValue = element.dataset.currentValue || "";

    // Create input element
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentValue;
    input.className = "hs-code-input";
    input.maxLength = 20;
    input.placeholder = "Enter HS Code";

    // Replace the span with input
    element.style.display = "none";
    element.parentNode.insertBefore(input, element);
    input.focus();
    input.select();

    // Handle save on Enter or blur
    const saveHsCode = async () => {
      const newValue = input.value.trim();
      const originalValue = element.dataset.currentValue || "";

      // Check if value actually changed
      if (newValue === originalValue) {
        input.remove();
        element.style.display = "inline";
        return;
      }

      // Validate HS Code format
      if (newValue) {
        const digitsOnly = newValue.replace(/\./g, ""); // Remove dots
        const hsCodePattern = /^[\d.]+$/; // Only digits and dots

        if (!hsCodePattern.test(newValue)) {
          showToast("HS Code must contain only digits and dots.", true);
          input.className = "hs-code-input hs-code-error";
          input.disabled = false;
          input.focus();
          return;
        }

        if (digitsOnly.length < 6) {
          showToast("HS Code must be at least 6 digits long.", true);
          input.className = "hs-code-input hs-code-error";
          input.disabled = false;
          input.focus();
          return;
        }

        if (digitsOnly.length > 20) {
          showToast("HS Code cannot exceed 20 digits.", true);
          input.className = "hs-code-input hs-code-error";
          input.disabled = false;
          input.focus();
          return;
        }
      }

      // Show saving state
      input.className = "hs-code-input hs-code-saving";
      input.disabled = true;

      try {
        const response = await fetch(
          `/customs/cargo/${cargoId}/update-hs-code/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrftoken,
            },
            body: JSON.stringify({ hs_code: newValue }),
          }
        );

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await response.text();
          console.log("Non-JSON response:", responseText.substring(0, 200));
          throw new Error(
            "Server returned HTML instead of JSON - check URL pattern"
          );
        }

        const data = await response.json();

        if (response.ok) {
          // Update the original element
          element.textContent = newValue || "—";
          if (newValue) {
            element.innerHTML = `${newValue}`;
          } else {
            element.innerHTML = `—`;
          }
          element.dataset.currentValue = newValue;

          // Show success briefly
          input.className = "hs-code-input hs-code-success";
          setTimeout(() => {
            input.remove();
            element.style.display = "inline";
          }, 500);

          showToast("HS Code updated successfully!");
        } else {
          showToast("Failed to update HS Code", true);
          throw new Error(data.error || "Failed to update HS Code");
        }
      } catch (error) {
        console.error("Error updating HS Code:", error);
        input.className = "hs-code-input hs-code-error";
        input.disabled = false;
        showToast("Failed to update HS Code. Please try again.", true);

        // Re-enable editing after error
        setTimeout(() => {
          input.className = "hs-code-input";
        }, 1000);
      }
    };
    // Handle cancel
    const cancelEdit = () => {
      input.remove();
      element.style.display = "inline";
    };

    // Event listeners
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveHsCode();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    });

    input.addEventListener("blur", () => {
      // Small delay to allow click events to process
      setTimeout(() => {
        if (document.activeElement !== input) {
          saveHsCode();
        }
      }, 100);
    });
  };

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
        // document.querySelector(
        //   `.btn-icon.approve[data-submanifest-id="${submanifestId}"]`
        // ).disabled = true;
        // document.querySelector(
        //   `.btn-icon.reject[data-submanifest-id="${submanifestId}"]`
        // ).disabled = true;

        // hide the actions buttons:
        const actionContainer = document.querySelector(
          ".submanifest-actions-container"
        );
        console.log(actionContainer);
        console.log(data);
        if (actionContainer) {
          actionContainer.style.display = "none";
        }
        // Update status display if new status is provided
        if (data.new_status) {
          const statusElement = document.querySelector("#status-container");
          console.log("status elem: ", statusElement);
          console.log("data.new_status: ", data.new_status);
          if (statusElement) {
            // Update status text and class
            const statusMapping = {
              pending_customs: "Pending Customs Review",
              approved: "Approved",
              rejected_by_admin: "Rejected by Admin",
              rejected_by_customs: "Rejected by Customs",
            };

            statusElement.textContent =
              statusMapping[data.new_status] || data.new_status;
            statusElement.className = `status-${data.new_status.replace(
              "_",
              "-"
            )}`;
          }
        }
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
