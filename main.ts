import * as fs from 'fs';

console.log('hi');

type User = {
    name: string;
    age: number;
};

function isAdult(user: User): boolean {
    return user.age >= 16;
}

let justine: User = {
    name: 'Justine',
    age: 23
};

let isJustineAnAdult: boolean = isAdult(justine);

console.log(isJustineAnAdult);
