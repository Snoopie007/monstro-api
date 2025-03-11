import Mention from "@tiptap/extension-mention"

export const Variable = Mention.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            value: {
                default: null,
                parseHTML: (element) => {
                    return {
                        uuid: element.getAttribute("data-mention-uuid")
                    };
                },
                renderHTML: (attributes) => {
                    if (!attributes.value) {
                        return {};
                    }

                    return {
                        "data-value": attributes.value
                    };
                }
            }
        };
    },
})