document.addEventListener("DOMContentLoaded", () => {
  // === Document Upload Logic ===

  console.log("Document upload script loaded");
  const fileMappings = [
    {
      cardId: "billOfLadingCard",
      inputId: "billOfLadingInput",
      fileNameId: "billOfLadingFileName",
      previewId: "billOfLadingPreview",
    },
    {
      cardId: "commercialInvoiceCard",
      inputId: "commercialInvoiceInput",
      fileNameId: "commercialInvoiceFileName",
      previewId: "commercialInvoicePreview",
    },
    {
      cardId: "packingListCard",
      inputId: "packingListInput",
      fileNameId: "packingListFileName",
      previewId: "packingListPreview",
    },
    {
      cardId: "certificateOriginCard",
      inputId: "certificateOriginInput",
      fileNameId: "certificateOriginFileName",
      previewId: "certificateOriginPreview",
    },
    {
      cardId: "othersCard",
    },
  ];

  // Preview file helper
  function previewFile(inputEl, previewContainer, fileNameContainer) {
    const file = inputEl.files[0];
    previewContainer.innerHTML = "";
    fileNameContainer.textContent = "";

    if (!file) return;

    const fileType = file.type;

    const wrapper = document.createElement("div");
    wrapper.className = "file-preview-wrapper";

    // Common elements
    const nameLabel = document.createElement("span");
    nameLabel.textContent = file.name;
    nameLabel.className = "file-name-label";

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.className = "remove-preview-btn";
    removeBtn.title = "Remove file";

    removeBtn.addEventListener("click", () => {
      inputEl.value = ""; // clear file input
      previewContainer.innerHTML = ""; // remove preview
      fileNameContainer.textContent = ""; // clear name label
    });

    // Type-specific preview
    if (fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "file-preview-image";
      img.onload = () => URL.revokeObjectURL(img.src);

      wrapper.appendChild(img);
    } else if (fileType === "application/pdf") {
      const pdfIcon = document.createElement("i");
      pdfIcon.className = "fas fa-file-pdf pdf-icon";
      wrapper.appendChild(pdfIcon);
    } else if (
      fileType === "application/msword" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      console.log("Word document detected");
      const wordIcon = document.createElement("i");
      wordIcon.className = "fas fa-file-word word-icon";
      wrapper.appendChild(wordIcon);
    } else if (fileType.startsWith("text/") || file.name.endsWith(".txt")) {
      console.log("Text file detected");
      const txtIcon = document.createElement("i");
      txtIcon.className = "fas fa-file-alt txt-icon";
      wrapper.appendChild(txtIcon);
    } else {
      console.log("Unsupported file type:", fileType);
      const fallback = document.createElement("div");
      fallback.innerHTML =
        '<i class="fas fa-file file-icon"></i> Unsupported file type';
      fallback.className = "file-preview-unknown";
      wrapper.appendChild(fallback);
    }

    wrapper.appendChild(nameLabel);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
    // fileNameContainer.textContent = file.name;
  }

  fileMappings.forEach(({ cardId, inputId, fileNameId, previewId }) => {
    const card = document.getElementById(cardId);

    const fileInput = document.getElementById(inputId);
    const fileNameContainer = document.getElementById(fileNameId);
    const previewContainer = document.getElementById(previewId);

    // Trigger input on card click
    card.addEventListener("click", () => {
      fileInput.click();
    });

    // Handle file input
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;

      fileNameContainer.textContent = file.name;
      previewFile(fileInput, previewContainer, fileNameContainer);
    });
  });

  // === Adding Cargo Detail Logic ===

  const cargoContainer = document.getElementById("cargoContainer");
  const cargoTemplate = document.getElementById("cargoTemplate");

  const deleteModal = document.getElementById("confirmDeleteCargoModal");
  const closeModalBtn = document.getElementById("closeDeleteCargoModal");
  const cancelBtn = document.getElementById("cancelDeleteCargo");
  const confirmBtn = document.getElementById("confirmDeleteCargoBtn");

  let cargoToDelete = null;

  const renumberCargos = () => {
    document.querySelectorAll(".cargo-entry").forEach((entry, index) => {
      const number = entry.querySelector(".cargo-number");
      if (number) number.textContent = index + 1;
    });
  };

  const updateAddButtons = () => {
    const cargoEntries = document.querySelectorAll(".cargo-entry");

    cargoEntries.forEach((entry, index) => {
      const btnContainer = entry.querySelector(".cargo-btn-container");
      if (!btnContainer) return;

      // Remove any existing button first
      const existingBtn = btnContainer.querySelector(".addCargoBtn");
      if (existingBtn) existingBtn.remove();

      // Only add the button to the last entry
      if (index === cargoEntries.length - 1) {
        const newBtn = document.createElement("button");
        newBtn.type = "button";
        newBtn.className = "btn-confirm-delivery addCargoBtn";
        newBtn.textContent = "+ Add Another Cargo";
        btnContainer.appendChild(newBtn);
      }
    });
  };

  const showModal = () => (deleteModal.style.display = "flex");
  const closeModal = () => {
    deleteModal.style.display = "none";
    cargoToDelete = null;
  };

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

  // Delegated click handler
  cargoContainer.addEventListener("click", (e) => {
    const target = e.target;

    if (target.classList.contains("addCargoBtn")) {
      const clone = cargoTemplate.content.cloneNode(true);
      cargoContainer.appendChild(clone);
      renumberCargos();
      updateAddButtons();
    }

    if (target.classList.contains("btn-remove-cargo")) {
      const entry = target.closest(".cargo-entry");
      const total = document.querySelectorAll(".cargo-entry").length;

      if (entry && total > 1) {
        cargoToDelete = entry;
        showModal();
      } else {
        showToast("At least one cargo entry is required", true);
      }
    }
  });

  // Confirm delete button
  confirmBtn.addEventListener("click", () => {
    if (cargoToDelete) {
      cargoToDelete.remove();
      renumberCargos();
      updateAddButtons();
      showToast("Cargo entry deleted successfully");
    }
    closeModal();
  });

  // Modal close/cancel
  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // === Spinner and Form Submission ===
  const form = document.getElementById("submitShipmentForm");

  const submitBtn = document.querySelector(".btn-submit");
  const btnIcon = submitBtn.querySelector(".btn-icon");
  const btnText = submitBtn.querySelector(".btn-text");

  if (!form) return;

  const containerInput = document.getElementById("containerNumber");
  if (containerInput) {
    containerInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }

  const validateFormFields = () => {
    let isValid = true;
    let firstInvalidField = null;
    let toastShown = false;

    const showFieldError = (field, message) => {
      field.classList.add("input-error");
      if (!toastShown) {
        showToast(message, true);
        toastShown = true;
      }
      if (!firstInvalidField) firstInvalidField = field;
      isValid = false;
    };

    const requiredFields = form.querySelectorAll("[data-required]");
    requiredFields.forEach((field) => {
      const value = field.value.trim();

      // Handle empty
      if (!value) {
        showFieldError(field, "Please fill out all required fields.");
        return;
      }

      // Handle email
      if (field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          showFieldError(field, "Please enter a valid email address.");
        } else {
          field.classList.remove("input-error");
        }
      } else {
        field.classList.remove("input-error");
      }
    });

    // === Container and Seal Number Specific Validation ===
    const containerField = form.querySelector('[name="container_number"]');
    const sealField = form.querySelector('[name="seal_no"]');

    if (containerField) {
      // convert to uppercase
      const containerValue = containerField.value.trim().toUpperCase();
      // console.log("container value: ", containerValue);
      const containerRegex = /^[A-Z]{4}\d{7}$/;

      console.log("test: ", containerRegex.test(containerValue));

      if (!containerRegex.test(containerValue)) {
        showFieldError(
          containerField,
          "Container number must follow the ISO 6346 format: 4 letters + 7 digits (e.g., MSCU1234567)."
        );
      }
    }

    if (sealField) {
      const sealValue = sealField.value.trim();
      const sealRegex = /^\d{6,10}$/;

      if (!sealRegex.test(sealValue)) {
        showFieldError(sealField, "Seal number must be 6 to 10 digits long.");
      }
    }

    // Handle cargo entries
    const cargoEntries = form.querySelectorAll(".cargo-entry");
    cargoEntries.forEach((entry, index) => {
      const description = entry.querySelector(
        "textarea[name='cargo_description[]']"
      );
      const quantity = entry.querySelector("input[name='quantity[]']");
      const weight = entry.querySelector("input[name='weight[]']");
      const value = entry.querySelector("input[name='value[]']");

      if (!description || !quantity || !weight || !value) return;

      if (!description.value.trim()) {
        showFieldError(
          description,
          `Cargo #${index + 1}: Description is required.`
        );
      } else {
        description.classList.remove("input-error");
      }

      if (!quantity.value || parseInt(quantity.value) <= 0) {
        showFieldError(
          quantity,
          `Cargo #${index + 1}: Quantity must be at least 1.`
        );
      } else {
        quantity.classList.remove("input-error");
      }

      if (!weight.value || parseFloat(weight.value) < 0) {
        showFieldError(
          weight,
          `Cargo #${index + 1}: Weight must be 0 or more.`
        );
      } else {
        weight.classList.remove("input-error");
      }

      if (!value.value || parseFloat(value.value) < 0) {
        showFieldError(value, `Cargo #${index + 1}: Value must be 0 or more.`);
      } else {
        value.classList.remove("input-error");
      }
    });

    if (!isValid && firstInvalidField) {
      firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalidField.focus();
    }

    return isValid;
  };

  // spinner on button
  const showSpinnerOnButton = () => {
    btnIcon.innerHTML = "";
    btnIcon.classList.add("spinner");

    btnText.textContent = "Submitting...";
    submitBtn.disabled = true;
  };

  const resetButton = () => {
    btnIcon.classList.remove("loading-spinner");
    btnIcon.innerHTML = `<i class="fas fa-paper-plane"></i>`;
    btnText.textContent = "Submit Submanifest";
    submitBtn.disabled = false;
  };

  const disableForm = () => {
    [...form.elements].forEach((el) => (el.disabled = true));
  };

  const enableForm = () => {
    [...form.elements].forEach((el) => (el.disabled = false));
  };

  form.addEventListener("submit", async (e) => {
    console.log("submitting...");

    e.preventDefault();
    e.stopPropagation();

    if (!validateFormFields()) return;

    showSpinnerOnButton();
    disableForm();

    const formData = new FormData();

    // base fields
    const baseFields = [
      "voyage_id",
      "consignee_name",
      "consignee_email",
      "consignee_address",
      "consignor_name",
      "consignor_email",
      "consignor_address",
      "container_no",
      "seal_no",
      "bill_of_lading_no",
      "handling_instruction",
    ];

    baseFields.forEach((field) => {
      const el = form.querySelector(`[name="${field}"]`);
      if (el) {
        formData.append(field, el.value.trim());
      }
    });

    // === Cargos ===
    const cargoEntries = form.querySelectorAll(".cargo-entry");
    cargoEntries.forEach((entry, index) => {
      const description = entry.querySelector(
        `textarea[name='cargo_description[]']`
      );
      const quantity = entry.querySelector(`input[name='quantity[]']`);
      const weight = entry.querySelector(`input[name='weight[]']`);
      const value = entry.querySelector(`input[name='value[]']`);
      const hsCode = entry.querySelector(`input[name='hs_code[]']`);
      const additionalInfo = entry.querySelector(
        `textarea[name='additional_info[]']`
      );

      formData.append("cargo_description[]", description?.value || "");
      formData.append("quantity[]", quantity?.value || "0");
      formData.append("weight[]", weight?.value || "0");
      formData.append("value[]", value?.value || "0");
      formData.append("hs_code[]", hsCode?.value || "");
      formData.append("additional_info[]", additionalInfo?.value || "");
    });

    // === Documents ===
    const docInputs = [
      { name: "bill_of_lading", id: "billOfLadingInput" },
      { name: "invoice", id: "commercialInvoiceInput" },
      { name: "packing_list", id: "packingListInput" },
      { name: "other", id: "certificateOriginInput" }, // rename or expand if needed
    ];

    docInputs.forEach(({ name, id }) => {
      const input = document.getElementById(id);
      if (input && input.files.length > 0) {
        const file = input.files[0];
        formData.append("documents", file, file.name); // Django expects `documents` as a list
      }
    });

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        showToast("Shipment submitted successfully.", false);
        // redirect or something...
      } else {
        showToast(
          result.error || "Something went wrong. Please try again.",
          true
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      showToast(
        "A network error occurred. Please check your connection.",
        true
      );
    } finally {
      resetButton();
      enableForm();
    }
  });

  form.querySelectorAll("[data-required]").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.classList.contains("input-error") && field.value.trim()) {
        field.classList.remove("input-error");
      }
    });
  });

  // Initialize on page load
  renumberCargos();
  updateAddButtons();
});
