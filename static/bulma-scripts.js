(() => {
    let triggers = () => {
        // Functions to open and close a modal
        function openModal($el) {
            $el.classList.add('is-active');
        }

        function closeModal($el) {
            $el.classList.remove('is-active');
        }

        function closeAllModals() {
            (document.querySelectorAll('.modal') || []).forEach(($modal) => {
                closeModal($modal);
            });
        }

        function setAction(a) {
            data.interactions.select.value = a;
        }

        function setPart(p) {
            data.interactions.part.value = p;
        }

        // Add a click event on buttons to open a specific modal
        (document.querySelectorAll('.js-modal-trigger') || []).forEach(($trigger) => {
            const modal = $trigger.dataset.target;
            const $target = document.getElementById(modal);

            $trigger.addEventListener('click', () => {
                openModal($target);
            });
        });

        // Add a click event on various child elements to close the parent modal
        (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button') || []).forEach(($close) => {
            const $target = $close.closest('.modal');

            $close.addEventListener('click', () => {
                closeModal($target);
            });
        });

        // Add a keyboard event to close all modals
        document.addEventListener('keydown', (event) => {
            const e = event || window.event;

            switch(e.code) {
                case 'Escape':
                    closeAllModals();
                    break;
                case 'KeyA':
                    setAction('add');
                    break;
                case 'KeyD':
                    setAction('delete');
                    break;
                case 'KeyG':
                    setAction('group');
                    break;
                case 'KeyC':
                    setAction('create');
                    break;
                case 'KeyT':
                    setAction('trim');
                    break;
                case 'KeyF':
                    document.getElementById('next').click()
                    break;
                case 'KeyB':
                    document.getElementById('prev').click()
                    break;

            }
            for(let i = 0; i < data.doc.info.parts.length; i++) {
                if(e.code == 'Digit' + (i + 1)) {
                    setPart(i);
                }
            }
        });
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        triggers();
    } else {
        document.addEventListener('DOMContentLoaded', triggers);
    }
})();