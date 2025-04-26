import Mention from "@tiptap/extension-mention"

export const Variable = Mention.extend({
    addAttributes() {
        return {
            ...this.parent?.(),

            value: {
                default: null,
                parseHTML: (element) => {
                    return element.getAttribute("data-value")
                },
                renderHTML: (attributes) => {
                    return {
                        "data-value": attributes.value
                    };
                }
            }
        };
    },
})