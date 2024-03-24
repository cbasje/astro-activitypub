export const parseJSON = (text: string) => {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
};
