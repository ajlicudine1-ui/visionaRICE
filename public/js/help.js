(() => {
    "use strict";

    document
        .querySelectorAll(
            ".faq-question"
        )
        .forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        const item =
                            button.closest(
                                ".faq-item"
                            );

                        const isOpen =
                            item.classList.contains(
                                "active"
                            );

                        document
                            .querySelectorAll(
                                ".faq-item.active"
                            )
                            .forEach(
                                openItem => {
                                    openItem.classList.remove(
                                        "active"
                                    );

                                    const openButton =
                                        openItem.querySelector(
                                            ".faq-question"
                                        );

                                    if (openButton) {
                                        openButton.setAttribute(
                                            "aria-expanded",
                                            "false"
                                        );
                                    }
                                }
                            );

                        if (!isOpen) {
                            item.classList.add(
                                "active"
                            );

                            button.setAttribute(
                                "aria-expanded",
                                "true"
                            );
                        }
                    }
                );
            }
        );
})();
