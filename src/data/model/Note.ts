export default class Note {
    constructor(
        public global_id: string,
        public title: string,
        public content: string,
        public id: string = "",
    ) {}
}