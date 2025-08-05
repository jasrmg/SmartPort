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
      inputId: "othersInput",
      fileNameId: "othersFileName",
      previewId: "othersPreview",
      isOthers: true,
    },
  ];

  // Preview file helper
  const othersFileInputs = [];
  const othersPreviewContainers = [];
  const othersFileNameContainers = [];

  const previewFile = (inputEl, previewContainer, fileNameContainer) => {
    const file = inputEl.files[0];
    previewContainer.innerHTML = "";
    fileNameContainer.textContent = "";

    if (!file) return;

    const fileType = file.type;

    const wrapper = document.createElement("div");
    wrapper.className = "file-preview-wrapper";

    const nameLabel = document.createElement("span");
    nameLabel.textContent = file.name;
    nameLabel.className = "file-name-label";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.className = "remove-preview-btn";
    removeBtn.title = "Remove file";

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click event

      // Find the card element that contains this input
      const cardElement =
        inputEl.closest(".others-card") ||
        document.getElementById(inputEl.id.replace("Input", "Card"));
      const isOthersCard =
        cardElement && cardElement.classList.contains("others-card");

      if (!isOthersCard) {
        // Standard behavior for non-'Others' cards - just clear preview
        inputEl.value = "";
        previewContainer.innerHTML = "";
        fileNameContainer.textContent = "";
        return;
      }

      // For 'Others' cards, show confirmation modal
      showRemoveModal(
        inputEl,
        previewContainer,
        fileNameContainer,
        cardElement
      );
    });

    // === FILE TYPE DISPLAY LOGIC ===
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
      const wordIcon = document.createElement("i");
      wordIcon.className = "fas fa-file-word word-icon";
      wrapper.appendChild(wordIcon);
    } else if (fileType.startsWith("text/") || file.name.endsWith(".txt")) {
      const txtIcon = document.createElement("i");
      txtIcon.className = "fas fa-file-alt txt-icon";
      wrapper.appendChild(txtIcon);
    } else {
      const fallback = document.createElement("div");
      fallback.innerHTML =
        '<i class="fas fa-file file-icon"></i> Unsupported file type';
      fallback.className = "file-preview-unknown";
      wrapper.appendChild(fallback);
    }

    wrapper.appendChild(nameLabel);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  };

  let skipNextClick = false;

  const initDocumentCard = ({
    cardId,
    inputId,
    fileNameId,
    previewId,
    isOthers = false,
  }) => {
    const card = document.getElementById(cardId);
    const fileInput = document.getElementById(inputId);
    const fileNameContainer = document.getElementById(fileNameId);
    const previewContainer = document.getElementById(previewId);

    if (!card || !fileInput) return;

    card.addEventListener("click", () => {
      if (skipNextClick) {
        skipNextClick = false;
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;

      showToast(`Will be uploaded as: ${file.name}`);
      fileNameContainer.textContent = file.name;
      previewFile(fileInput, previewContainer, fileNameContainer, isOthers);

      if (isOthers) {
        createAnotherOthersCard();
      }
    });
  };

  // CONFIRMATION MODAL FOR REMOVING OTHERS UPLOADED FILE
  const removeModal = document.getElementById("confirmRemoveOthersModal");
  const closeRemoveUploadModal = document.getElementById(
    "closeRemoveUploadModal"
  );
  const cancelRemoveUploadBtn = document.getElementById(
    "cancelRemoveUploadBtn"
  );
  const confirmRemoveUploadBtn = document.getElementById(
    "confirmRemoveUploadBtn"
  );

  let pendingRemovalData = null;

  const showRemoveModal = (
    inputEl,
    previewContainer,
    fileNameContainer,
    cardEl
  ) => {
    pendingRemovalData = {
      input: inputEl,
      preview: previewContainer,
      fileName: fileNameContainer,
      card: cardEl,
    };

    removeModal.style.display = "flex";
  };

  const hideRemoveModal = () => {
    removeModal.style.display = "none";
    pendingRemovalData = null;
  };

  const confirmRemoval = () => {
    if (!pendingRemovalData) return;

    const { input, preview, fileName, card } = pendingRemovalData;

    // Clear the file input and preview
    skipNextClick = true;
    input.value = "";
    preview.innerHTML = "";
    fileName.textContent = "";

    // Get all others cards and inputs
    const othersCards = document.querySelectorAll(".others-card");
    const othersInputs = document.querySelectorAll(
      'input[name="other_documents"]'
    );

    // Count empty others cards
    const emptyOthersCards = Array.from(othersCards).filter((cardElement) => {
      const cardInput = cardElement.nextElementSibling;
      return (
        cardInput &&
        cardInput.tagName === "INPUT" &&
        cardInput.files.length === 0
      );
    });

    // Remove the card only if there will be at least one empty "Others" card remaining
    if (emptyOthersCards.length > 1) {
      card.classList.add("fade-out");
      setTimeout(() => {
        // Remove both the card and its associated input
        const associatedInput = card.nextElementSibling;
        if (associatedInput && associatedInput.tagName === "INPUT") {
          associatedInput.remove();
        }
        card.remove();
      }, 300);
    }

    hideRemoveModal();
  };

  // Modal event listeners
  cancelRemoveUploadBtn.addEventListener("click", hideRemoveModal);
  closeRemoveUploadModal.addEventListener("click", hideRemoveModal);
  confirmRemoveUploadBtn.addEventListener("click", confirmRemoval);

  // Close modal when clicking outside
  removeModal.addEventListener("click", (e) => {
    if (e.target === removeModal) {
      hideRemoveModal();
    }
  });

  fileMappings.forEach(initDocumentCard);

  let otherDocCount = 1;

  const createAnotherOthersCard = () => {
    // Check if there's already an empty others card
    const othersInputs = document.querySelectorAll(
      'input[name="other_documents"]'
    );
    const hasEmpty = Array.from(othersInputs).some(
      (input) => input.files.length === 0
    );

    if (hasEmpty) return; // Don't add another if an empty one already exists

    otherDocCount += 1;
    const idSuffix = `others${otherDocCount}`;
    const container = document.querySelector(".document-types");

    const cardDiv = document.createElement("div");
    cardDiv.className = "document-type-card others-card";
    cardDiv.id = `${idSuffix}Card`;
    cardDiv.style.cursor = "pointer";
    cardDiv.innerHTML = `
      <i class="fas fa-ellipsis-h document-type-icon"></i>
      <div class="document-type-title">Upload Other Documents</div>
      <div class="document-type-desc">Other supporting documents as required for the shipment.</div>
      <div class="uploaded-file-name" id="${idSuffix}FileName"></div>
      <div class="file-preview-area" id="${idSuffix}Preview"></div>
    `;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.name = "other_documents";
    fileInput.id = `${idSuffix}Input`;
    fileInput.hidden = true;

    container.appendChild(cardDiv);
    container.appendChild(fileInput);

    initDocumentCard({
      cardId: `${idSuffix}Card`,
      inputId: `${idSuffix}Input`,
      fileNameId: `${idSuffix}FileName`,
      previewId: `${idSuffix}Preview`,
      isOthers: true,
    });
  };

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

  const clearAllFormData = () => {
    const form = document.getElementById("submitShipmentForm");
    if (!form) return;

    // reset all form data
    form.reset();

    // clear all file previews and file names for main document cards
    fileMappings.forEach(({ fileNameId, previewId }) => {
      const fileNameEl = document.getElementById(fileNameId);
      const previewEl = document.getElementById(previewId);

      if (fileNameEl) fileNameEl.textContent = "";
      if (previewEl) previewEl.innerHTML = "";
    });

    // remove all extra others card keep only the original one
    const othersCards = document.querySelectorAll(".others-card");
    const othersInputs = document.querySelectorAll(
      'input[name="other_documents"]'
    );

    othersCards.forEach((card, index) => {
      if (index > 0) {
        // Keep the first one
        const associatedInput = card.nextElementSibling;
        if (associatedInput && associatedInput.tagName === "INPUT") {
          associatedInput.remove();
        }
        card.remove();
      }
    });

    // clear the original others card
    const originalOthersFileName = document.getElementById("othersFileName");
    const originalOthersPreview = document.getElementById("othersPreview");
    if (originalOthersFileName) originalOthersFileName.textContent = "";
    if (originalOthersPreview) originalOthersPreview.innerHTML = "";

    // reset others counter
    otherDocCount = 1;

    // remove all extra cargo entries (keep only the first one)
    const cargoEntries = document.querySelectorAll(".cargo-entry");
    cargoEntries.forEach((entry, index) => {
      if (index > 0) {
        // Keep the first one
        entry.remove();
      }
    });

    // Clear the first cargo entry fields
    const firstCargoEntry = document.querySelector(".cargo-entry");
    if (firstCargoEntry) {
      const inputs = firstCargoEntry.querySelectorAll("input, textarea");
      inputs.forEach((input) => {
        input.value = "";
        input.classList.remove("input-error");
      });
    }

    // Remove error classes from all fields
    const errorFields = form.querySelectorAll(".input-error");
    errorFields.forEach((field) => field.classList.remove("input-error"));

    // Update cargo numbering and buttons
    renumberCargos();
    updateAddButtons();
  };

  // === Spinner and Form Submission ===
  const form = document.getElementById("submitShipmentForm");

  const submitBtn = document.querySelector(".btn-submit");
  const btnIcon = submitBtn.querySelector(".btn-icon");
  const btnText = submitBtn.querySelector(".btn-text");

  if (!form) return;

  // caps the inputs
  const containerInput = document.getElementById("containerNumber");
  const bolInput = document.getElementById("billOfLadingNumber");
  if (containerInput) {
    containerInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }
  if (bolInput) {
    bolInput.addEventListener("input", (e) => {
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

    const isBillOfLading = (value) => /^[A-Z0-9]{10,17}$/i.test(value.trim());

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

      // handle bill of lading

      if (field.name === "bill_of_lading") {
        if (!isBillOfLading(value)) {
          showFieldError(
            field,
            "Bill of lading must be 10 - 16 alphanumeric characters (no special characters)"
          );
        } else {
          field.classList.remove("input-error");
        }
        return;
      }
    });

    // === Container and Seal Number Specific Validation ===
    const containerField = form.querySelector('[name="container_number"]');
    const sealField = form.querySelector('[name="seal_no"]');

    if (containerField) {
      // convert to uppercase
      const containerValue = containerField.value.trim().toUpperCase();
      const containerRegex = /^[A-Z]{4}\d{7}$/;

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
    btnIcon.classList.remove("spinner");
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
      "container_number",
      "seal_number",
      "bill_of_lading_number",
      "handling_instructions",
    ];

    baseFields.forEach((field) => {
      const el = form.querySelector(`[name="${field}"]`);
      if (el) {
        formData.append(field, el.value.trim());
      }
    });

    // === Cargos ===
    const cargoEntries = form.querySelectorAll(".cargo-entry");
    const cargoItems = [];

    cargoEntries.forEach((entry) => {
      const description =
        entry
          .querySelector("textarea[name='cargo_description[]']")
          ?.value.trim() || "";
      const additionalInfo =
        entry
          .querySelector("textarea[name='additional_info[]']")
          ?.value.trim() || "";
      const quantity =
        entry.querySelector("input[name='quantity[]']")?.value || "0";
      const weight =
        entry.querySelector("input[name='weight[]']")?.value || "0";
      const value = entry.querySelector("input[name='value[]']")?.value || "0";
      const hsCode =
        entry.querySelector("input[name='hscode[]']")?.value.trim() || "";

      cargoItems.push({
        description,
        additional_info: additionalInfo,
        quantity: parseInt(quantity || "0", 10),
        weight: parseFloat(weight || "0", 10),
        value: parseFloat(value || "0", 10),
        hs_code: hsCode,
      });
    });

    formData.append("cargo_items", JSON.stringify(cargoItems));

    // === Documents ===
    const docInputs = [
      { name: "bill_of_lading", id: "billOfLadingInput" },
      { name: "commercial_invoice", id: "commercialInvoiceInput" },
      { name: "packing_list", id: "packingListInput" },
      { name: "certificate_origin", id: "certificateOriginInput" },
    ];

    docInputs.forEach(({ name, id }) => {
      const input = document.getElementById(id);
      if (input && input.files.length > 0) {
        formData.append(name, input.files[0]);
      }
    });

    // Append dynamic others
    const otherInputs = document.querySelectorAll(
      'input[name="other_documents"]'
    );
    otherInputs.forEach((input) => {
      if (input.files.length > 0) {
        formData.append("other_documents", input.files[0]);
      }
    });

    try {
      const response = await fetch(`/submit-shipment/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast("Shipment submitted successfully.", false);
        clearAllFormData();
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
