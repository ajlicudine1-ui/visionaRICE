async function loadSidebar() {

    const container =
        document.getElementById(
            'sidebar-container'
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                '/components/sidebar.html'
            );

        const html =
            await response.text();

        container.innerHTML =
            html;

        setActiveSidebarPage();

    } catch (error) {

        console.error(
            'Sidebar load failed:',
            error
        );

    }
}


function setActiveSidebarPage() {

    const currentPage =
        window.location.pathname
            .split('/')
            .pop()
            .replace(
                '.html',
                ''
            );

    const links =
        document.querySelectorAll(
            '.sidebar-nav a'
        );

    links.forEach(link => {

        const page =
            link.dataset.page;

        if (
            page ===
            currentPage
        ) {

            link.classList.add(
                'active'
            );

        } else {

            link.classList.remove(
                'active'
            );

        }

    });
}


document.addEventListener(
    'DOMContentLoaded',
    loadSidebar
);